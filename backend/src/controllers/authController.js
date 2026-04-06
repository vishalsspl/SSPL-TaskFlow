import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMemberInvitationEmail, sendPasswordResetEmail, sendOrgSignupEmail } from '../services/emailService.js';

// ── Helper: Resolve Active Features ───────────────────────────────────────
export const getActiveFeatures = async (org) => {
  if (!org) return {};

  const baselines = {
    free: { projects: true, tasks: true, team: false, chat: false, tickets: false, branding: false, kanban: false, timesheets: false, performance: false },
    starter: { projects: true, tasks: true, team: true, chat: false, tickets: false, branding: false, kanban: true, timesheets: false, performance: false },
    pro: { projects: true, tasks: true, team: true, chat: true, tickets: false, branding: true, kanban: true, timesheets: true, performance: true },
    enterprise: { projects: true, tasks: true, team: true, chat: true, tickets: true, branding: true, kanban: true, timesheets: true, performance: true }
  };

  const planKey = org.plan.toLowerCase();
  const defaultFeaturesSetting = await prisma.platformSetting.findUnique({
    where: { key: `${planKey}_features` }
  });

  // Plan defaults: from DB setting or hardcoded baseline
  const rawPlanDefaults = defaultFeaturesSetting
    ? JSON.parse(defaultFeaturesSetting.value)
    : (baselines[planKey] || {});

  // ── NORMALIZATION: Ensure all plan default keys are lowercase ───────────
  const normalizedPlanDefaults = {};
  Object.keys(rawPlanDefaults).forEach(key => {
    normalizedPlanDefaults[key.toLowerCase()] = rawPlanDefaults[key];
  });

  // Merge customFeatures ON TOP - also normalized
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

  const user = await prisma.user.findFirst({
    where: { email },
    include: { organization: true },
  });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.role !== 'SUPERADMIN' && user.organization?.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your organisation account has been suspended.' });
  }

  const activeFeatures = await getActiveFeatures(user.organization);

  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...userWithoutPassword } = user;

  if (userWithoutPassword.organization) {
    userWithoutPassword.organization = {
      ...userWithoutPassword.organization,
      activeFeatures
    };
    userWithoutPassword.activeFeatures = activeFeatures;
    userWithoutPassword.permissionsTimestamp = Date.now();
  }

  res.json({ token, user: userWithoutPassword });
};

// ── signup ─────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  console.log('[Signup] Request Body:', req.body);
  const { name, email, password, organizationName, industry, size, website, country, timezone, role: requestedRole } = req.body;
  const role = requestedRole || 'ADMIN';

  if (!name || !email || !password || !organizationName) {
    return res.status(400).json({ error: 'Name, email, password, and organisation name are required' });
  }

  // Simplified validation for ADMIN setup
  if (role === 'ADMIN' && (!industry || !size)) {
    return res.status(400).json({ error: 'Industry and Company Size are mandatory for organisation setup.' });
  }

  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return res.status(400).json({ error: 'Name cannot contain special characters.' });
  if (organizationName && organizationName.trim().length < 2) return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });

  // Exists checks
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
    const user = await prisma.user.create({
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

    const { passwordHash: _ph, ...userWithoutPassword } = user;
    return res.status(201).json({ user: userWithoutPassword, message: 'Signup successful. Your account is pending approval.' });
  }

  // Create new organization and admin user
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

  const user = await prisma.user.create({
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

  const token = jwt.sign(
    { userId: user.id, organizationId: org.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash: _ph, ...userWithoutPassword } = user;
  res.status(201).json({ token, user: userWithoutPassword });
};

// ── invite ─────────────────────────────────────────────────────────────────
export const invite = async (req, res) => {
  const { email, name, role, password } = req.body;
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

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'User email already exists' });

  const finalPassword = password || Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(finalPassword, 10);

  const user = await prisma.user.create({
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

  await prisma.activityLog.create({
    data: { 
        userId: req.user.id, 
        organizationId: req.user.organizationId,
        action: 'INVITED', 
        entity: 'user', 
        entityId: user.id, 
        details: { email, name, role } 
    },
  });

  sendMemberInvitationEmail(email, name, finalPassword, role).catch(err => console.error(err));

  const { passwordHash: _, ...userWithoutPassword } = user;
  res.status(201).json({ user: userWithoutPassword, message: 'User invited.' });
};

// ── changePassword ─────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({ 
    where: { id: userId }, 
    data: { passwordHash: newPasswordHash, mustChangePassword: false } 
  });

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
  const { passwordHash, ...userWithoutPassword } = req.user;

  if (userWithoutPassword.organization || freshOrg) {
    userWithoutPassword.organization = {
      ...(userWithoutPassword.organization || {}),
      ...(freshOrg || {}),
      activeFeatures,
    };
    userWithoutPassword.activeFeatures = activeFeatures;
    userWithoutPassword.permissionsTimestamp = Date.now();
  }

  res.json(userWithoutPassword);
};

// ── forgotPassword ─────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await prisma.user.findFirst({ 
    where: { email }, 
    include: { organization: true } 
  });
  
  if (!user) return res.json({ message: 'If an account exists, a reset link was sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry }
  });

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  await sendPasswordResetEmail(user.email, user.name, resetLink);
  res.json({ message: 'If an account exists, a reset link was sent.' });
};

// ── resetPassword ──────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ chars' });

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { 
        passwordHash, 
        resetToken: null, 
        resetTokenExpiry: null 
    }
  });

  res.json({ message: 'Password reset successfully' });
};