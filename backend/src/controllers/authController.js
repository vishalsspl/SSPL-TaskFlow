import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMemberInvitationEmail, sendPasswordResetEmail, sendOrgSignupEmail } from '../services/emailService.js';
import { provisionTenantDatabase } from '../services/tenantProvisioner.js';
import tenantDbManager from '../lib/tenantDbManager.js';

// ── Helper: Resolve Active Features ───────────────────────────────────────
export const getActiveFeatures = async (org) => {
  // ── SUPERADMIN / NO ORG: Full access to all features ────────────────────
  if (!org) {
    return {
      projects: true,
      tasks: true,
      team: true,
      chat: true,
      tickets: true,
      branding: true,
      kanban: true,
      timesheets: true,
      performance: true,
      emailSupport: true
    };
  }

  const baselines = {
    free: { projects: true, tasks: true, team: false, chat: false, tickets: false, branding: false, kanban: false, timesheets: false, performance: false, emailSupport: true },
    starter: { projects: true, tasks: true, team: true, chat: false, tickets: false, branding: false, kanban: true, timesheets: false, performance: false, emailSupport: true },
    pro: { projects: true, tasks: true, team: true, chat: true, tickets: false, branding: true, kanban: true, timesheets: true, performance: true, emailSupport: true },
    enterprise: { projects: true, tasks: true, team: true, chat: true, tickets: true, branding: true, kanban: true, timesheets: true, performance: true, emailSupport: true }
  };

  const planKey = org.plan.toLowerCase();
  const defaultFeaturesSetting = await prisma.platformSetting.findUnique({
    where: { key: `${planKey}_features` }
  });

  const rawPlanDefaults = defaultFeaturesSetting
    ? JSON.parse(defaultFeaturesSetting.value)
    : (baselines[planKey] || {});

  const normalizedPlanDefaults = {};
  Object.keys(rawPlanDefaults).forEach(key => {
    normalizedPlanDefaults[key.toLowerCase()] = rawPlanDefaults[key];
  });

  const custom = (org.customFeatures && typeof org.customFeatures === 'object') ? org.customFeatures : {};
  const normalizedCustom = {};
  Object.keys(custom).forEach(key => {
    normalizedCustom[key.toLowerCase()] = custom[key];
  });

  return { ...normalizedPlanDefaults, ...normalizedCustom };
};

// ── login ──────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // 1. Look up user in MAIN DB (auth lookup table)
  const user = await prisma.user.findFirst({
    where: { email },
    include: { organization: true },
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // 2. Verify password against MAIN DB passwordHash
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  // 3. Check org suspension
  if (user.role !== 'SUPERADMIN' && user.organization?.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your organisation account has been suspended.' });
  }

  // 4. Check approval status (SuperAdmin is always approved)
  if (user.role !== 'SUPERADMIN' && !user.isApproved) {
    return res.status(403).json({ error: 'Your account is pending approval. Please contact your organization administrator.' });
  }

  const activeFeatures = await getActiveFeatures(user.organization);

  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, resetToken, resetTokenExpiry, ...userWithoutSensitive } = user;

  if (userWithoutSensitive.organization) {
    userWithoutSensitive.organization = {
      ...userWithoutSensitive.organization,
      activeFeatures
    };
    userWithoutSensitive.activeFeatures = activeFeatures;
    userWithoutSensitive.permissionsTimestamp = Date.now();
  }

  // 5. ✅ NEW: Trigger Automatic Clock In (Attendance)
  if (user.role !== 'SUPERADMIN' && user.organization?.dbUrl) {
    try {
      const tenantClient = await tenantDbManager.getClient(user.organization.dbUrl);
      
      // Auto-close any previous active sessions for this user (cleanup)
      await tenantClient.attendance.updateMany({
        where: { userId: user.id, status: 'ACTIVE' },
        data: { 
          clockOut: new Date(),
          status: 'COMPLETED',
          durationMinutes: 0 // We don't know the actual duration of the 'forgotten' session
        }
      });

      // Create new active attendance session
      await tenantClient.attendance.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          clockIn: new Date(),
          status: 'ACTIVE'
        }
      });

      // Also log this as an activity
      await tenantClient.activityLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'LOGIN_CLOCK_IN',
          entity: 'attendance',
          details: { method: 'automatic_login' }
        }
      });
    } catch (attErr) {
      console.error('[Login Attendance] Failed to clock in:', attErr.message);
    }
  }

  res.json({ token, user: userWithoutSensitive });
};

// ── logout (Clock Out) ──────────────────────────────────────────────────────
export const logout = async (req, res) => {
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  try {
    // 1. Find the active attendance session
    const activeAttendance = await req.db.attendance.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
      orderBy: { clockIn: 'desc' }
    });

    if (activeAttendance) {
      const clockOut = new Date();
      const clockIn = new Date(activeAttendance.clockIn);
      const durationMinutes = Math.round((clockOut - clockIn) / (1000 * 60));

      await req.db.attendance.update({
        where: { id: activeAttendance.id },
        data: {
          clockOut,
          status: 'COMPLETED',
          durationMinutes: Math.max(0, durationMinutes)
        }
      });

      // Log activity
      await req.db.activityLog.create({
        data: {
          userId,
          organizationId,
          action: 'LOGOUT_CLOCK_OUT',
          entity: 'attendance',
          entityId: activeAttendance.id,
          details: { durationMinutes }
        }
      });
    }

    res.json({ message: 'Logged out and clocked out successfully' });
  } catch (error) {
    console.error('[Logout Clock Out] Error:', error.message);
    // Even if attendance fails, we want the user to feel logged out
    res.json({ message: 'Logged out' });
  }
};

// ── signup ─────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  console.log('[Signup] Request Body:', req.body);
  const { name, email, password, organizationName, industry, size, website, country, timezone, role: requestedRole } = req.body;
  const role = requestedRole || 'ADMIN';

  if (!name || !email || !password || !organizationName) {
    return res.status(400).json({ error: 'Name, email, password, and organisation name are required' });
  }

  if (role === 'ADMIN' && (!industry || !size)) {
    return res.status(400).json({ error: 'Industry and Company Size are mandatory for organisation setup.' });
  }

  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return res.status(400).json({ error: 'Name cannot contain special characters.' });
  if (organizationName && organizationName.trim().length < 2) return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });

  // Check duplicates in MAIN DB
  const existingOrg = await prisma.organization.findFirst({
    where: { name: { equals: organizationName.trim(), mode: 'insensitive' } }
  });

  const existingUser = await prisma.user.findFirst({ where: { email } });

  if (existingUser) {
    return res.status(400).json({ error: 'You are already registered with this email.' });
  }

  if (existingOrg && role === 'ADMIN') {
    return res.status(400).json({ error: 'Organisation name is already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // If org exists and user wants to join (PENDING)
  if (existingOrg && role !== 'ADMIN') {
    // Create user in MAIN DB (auth lookup)
    const mainUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        organizationId: existingOrg.id,
        isApproved: false,
        mustChangePassword: false
      },
      include: { organization: true },
    });

    // Create user in TENANT DB (app data)
    try {
      if (existingOrg.dbUrl) {
        const tenantClient = await tenantDbManager.getClient(existingOrg.dbUrl);
        await tenantClient.user.create({
          data: {
            id: mainUser.id,  // Same ID across both DBs
            name,
            email,
            passwordHash,
            role,
            organizationId: existingOrg.id,
            isApproved: false,
            mustChangePassword: false
          }
        });
      }
    } catch (tenantErr) {
      console.error('[Signup] Failed to create user in tenant DB:', tenantErr.message);
    }

    const { passwordHash: _ph, ...userWithoutPassword } = mainUser;
    return res.status(201).json({ user: userWithoutPassword, message: 'Signup successful. Your account is pending approval.' });
  }

  // ── Create new organization + tenant database ──────────────────────────

  // Fetch platform settings for limits/features
  const settings = await prisma.platformSetting.findMany();
  const s = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

  const trialDays = s.defaultTrialDays ? parseInt(s.defaultTrialDays) : 14;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  const getLimit = (planVal, type, hardcoded) => {
    const key = `${planVal.toLowerCase()}_max_${type}`;
    return s[key] ? Number(s[key]) : hardcoded;
  };

  const getFeatures = (planVal) => {
    const key = `${planVal.toLowerCase()}_features`;
    if (!s[key]) return {
      projects: true, kanban: true, tasks: true, tickets: true,
      team: true, chat: true, performance: true, timesheets: true
    };
    try {
      return typeof s[key] === 'string' ? JSON.parse(s[key]) : s[key];
    } catch (e) {
      return {
        projects: true, kanban: true, tasks: true, tickets: true,
        team: true, chat: true, performance: true, timesheets: true
      };
    }
  };

  const maxUsers = getLimit('FREE', 'users', 10);
  const maxProjects = getLimit('FREE', 'projects', 3);
  const customFeatures = getFeatures('FREE');

  // 1. Create Organization in MAIN DB
  const org = await prisma.organization.create({
    data: {
      name: organizationName.trim(),
      industry: industry || null,
      size: size || null,
      website: website?.trim() || null,
      country: country || null,
      timezone: timezone || 'Asia/Kolkata',
      plan: 'FREE',
      status: 'TRIAL',
      trialEndsAt,
      maxUsers,
      maxProjects,
      customFeatures
    }
  });

  // 2. Create admin user in MAIN DB (auth lookup)
  const mainUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      isApproved: true,
      mustChangePassword: false
    },
    include: { organization: true },
  });

  // 3. Provision tenant database (create DB, run migrations, seed)
  let tenantDbUrl = null;
  try {
    const orgDataForTenant = {
      id: org.id,
      name: org.name,
      plan: org.plan,
      status: org.status,
      maxUsers: org.maxUsers,
      maxProjects: org.maxProjects,
      industry: org.industry,
      size: org.size,
      website: org.website,
      country: org.country,
      timezone: org.timezone,
      billingEmail: org.billingEmail,
      customFeatures: org.customFeatures,
      trialEndsAt: org.trialEndsAt,
    };

    const adminDataForTenant = {
      id: mainUser.id,
      organizationId: org.id,
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      isApproved: true,
      mustChangePassword: false,
    };

    tenantDbUrl = await provisionTenantDatabase({
      orgId: org.id,
      orgName: org.name,
      orgData: orgDataForTenant,
      adminData: adminDataForTenant,
    });

    // 4. Update Organization in MAIN DB with the tenant DB URL
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        dbUrl: tenantDbUrl,
        dbStrategy: 'DEDICATED',
      },
    });

    console.log(`[Signup] ✅ Tenant DB provisioned for org "${org.name}"`);
  } catch (provisionErr) {
    console.error('[Signup] ❌ Tenant provisioning failed:', provisionErr.message);
    // The org and user are created in MAIN DB but without a tenant DB.
    // SuperAdmin can manually provision later via the CLI tool.
  }

  const token = jwt.sign(
    { userId: mainUser.id, organizationId: org.id, role: mainUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash: _ph, ...userWithoutPassword } = mainUser;
  res.status(201).json({ token, user: userWithoutPassword });
};

// ── invite ─────────────────────────────────────────────────────────────────
export const invite = async (req, res) => {
  const { email, name, role, password, sendEmail = true } = req.body;
  const organizationId = req.user.organizationId;

  if (!email || !name || !role) return res.status(400).json({ error: 'Email, name, and role required' });
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return res.status(400).json({ error: 'Name cannot contain special characters.' });

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { _count: { select: { users: true } } },
  });

  if (org && org._count.users >= org.maxUsers) {
    return res.status(403).json({ error: `User limit reached.` });
  }

  // Check if user exists in MAIN DB
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'User email already exists' });

  const finalPassword = password || Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(finalPassword, 10);

  // 1. Create user in MAIN DB (auth lookup)
  const mainUser = await prisma.user.create({
    data: {
      organizationId,
      name,
      email,
      passwordHash,
      role,
      isApproved: true,
      mustChangePassword: role !== 'ADMIN'
    }
  });

  // 2. Create user in TENANT DB (app data) via req.db
  try {
    const fs = await import('fs');
    fs.appendFileSync('debug_trace.log', `authController invite - req.db exists? ${!!req.db}\n`);
    fs.appendFileSync('debug_trace.log', `authController invite - req.db === prisma? ${req.db === prisma}\n`);
    if (req.db && req.db !== prisma) {
      fs.appendFileSync('debug_trace.log', `Entering req.db.user.create\n`);
      await req.db.user.create({
        data: {
          id: mainUser.id,
          organizationId,
          name,
          email,
          passwordHash,
          role,
          isApproved: true,
          mustChangePassword: role !== 'ADMIN'
        }
      });
      fs.appendFileSync('debug_trace.log', `Successfully created user in tenant DB\n`);
    } else {
       fs.appendFileSync('debug_trace.log', `Entering else block. org.dbUrl is: ${org.dbUrl}\n`);
       // If req.db is missing but org has a dbUrl, we have a configuration issue
       if (org.dbUrl) {
         throw new Error('Tenant database connection not available for this request.');
       }
    }
  } catch (tenantErr) {
    console.error('[Invite] Failed to create user in tenant DB:', tenantErr.message);

    // ROLLBACK: Delete from MAIN DB
    await prisma.user.delete({ where: { id: mainUser.id } }).catch(e => console.error('Rollback failed:', e.message));
    return res.status(500).json({ error: `Failed to synchronize user data to organization database. Detail: ${tenantErr.message}` });
  }

  // 3. Log activity
  try {
    const logData = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: 'INVITED',
      entity: 'user',
      entityId: mainUser.id,
      details: { email, name, role }
    };

    // Log to tenant DB (if available)
    if (req.db && req.db !== prisma) {
      await req.db.activityLog.create({ data: logData });
    }

    // Log to main DB for SuperAdmin visibility
    await prisma.activityLog.create({ data: logData });
  } catch (logErr) {
    console.error('[Invite] Failed to log activity:', logErr.message);
  }

  const hasEmailSupport = req.user.activeFeatures?.emailsupport !== false;

  if (hasEmailSupport && sendEmail) {
    sendMemberInvitationEmail(email, name, finalPassword, role).catch(err => console.error(err));
  }

  const { passwordHash: _, ...userWithoutPassword } = mainUser;
  res.status(201).json({ user: userWithoutPassword, message: 'User invited.' });
};

// ── changePassword ─────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  // Verify against MAIN DB
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update in MAIN DB
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash, mustChangePassword: false }
  });

  // Also update in TENANT DB for consistency
  try {
    if (req.db && req.db !== prisma) {
      await req.db.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash, mustChangePassword: false }
      });
    }
  } catch (tenantErr) {
    console.error('[ChangePassword] Failed to sync to tenant DB:', tenantErr.message);
  }

  // ✅ NEW: Activity Log (SAFE)
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId,
        organizationId: user.organizationId,
        action: 'PASSWORD_CHANGED',
        entity: 'user',
        entityId: userId,
        details: { email: user.email }
      }
    });
  } catch (e) {
    console.error('[ChangePassword] Log failed:', e.message);
  }

  res.json({ message: 'Password updated successfully' });
};

// ── me ─────────────────────────────────────────────────────────────────────
export const me = async (req, res) => {
  let freshOrg = null;
  if (req.user.organizationId) {
    freshOrg = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });
  }

  const activeFeatures = await getActiveFeatures(freshOrg || req.user.organization);
  const { passwordHash, resetToken, resetTokenExpiry, ...userWithoutSensitive } = req.user;

  // Ensure activeFeatures is always present (critical for SuperAdmin)
  userWithoutSensitive.activeFeatures = activeFeatures;
  userWithoutSensitive.permissionsTimestamp = Date.now();

  if (userWithoutSensitive.organization || freshOrg) {
    userWithoutSensitive.organization = {
      ...(userWithoutSensitive.organization || {}),
      ...(freshOrg || {}),
      activeFeatures,
    };
  }

  res.json(userWithoutSensitive);
};

// ── forgotPassword ─────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Look up in MAIN DB
  const user = await prisma.user.findFirst({
    where: { email },
    include: { organization: true }
  });

  if (!user) return res.json({ message: 'If an account exists, a reset link was sent.' });

  const resetTokenValue = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  // Store reset token in MAIN DB
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: resetTokenValue, resetTokenExpiry }
  });

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetTokenValue}`;
  await sendPasswordResetEmail(user.email, user.name, resetLink);

  // ✅ NEW: Activity Log (SAFE)
  try {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: 'PASSWORD_RESET_REQUEST',
        entity: 'user',
        entityId: user.id,
        details: { email: user.email }
      }
    });
  } catch (e) {
    console.error('[ForgotPassword] Log failed:', e.message);
  }

  res.json({ message: 'If an account exists, a reset link was sent.' });
};

// ── resetPassword ──────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ chars' });

  // Look up in MAIN DB
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const passwordHash = await bcrypt.hash(password, 10);

  // Update in MAIN DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  // Also update password in TENANT DB for consistency
  if (user.organizationId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { dbUrl: true }
      });
      if (org?.dbUrl) {
        const tenantClient = await tenantDbManager.getClient(org.dbUrl);
        await tenantClient.user.update({
          where: { id: user.id },
          data: { passwordHash }
        });
      }
    } catch (tenantErr) {
      console.error('[ResetPassword] Failed to sync to tenant DB:', tenantErr.message);
    }
  }

  // ✅ NEW: Activity Log (SAFE)
  try {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: 'PASSWORD_RESET',
        entity: 'user',
        entityId: user.id,
        details: { email: user.email }
      }
    });
  } catch (e) {
    console.error('[ResetPassword] Log failed:', e.message);
  }

  res.json({ message: 'Password reset successfully' });
};