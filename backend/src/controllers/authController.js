import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMemberInvitationEmail, sendPasswordResetEmail, sendOrgSignupEmail } from '../services/emailService.js';

// ── Helper: Resolve Active Features (Single Source of Truth) ──────────────────
const getActiveFeatures = async (org) => {
  if (!org) return {};
  
  // 1. Check for a "Master List" override (Organization-level customization)
  if (org.customFeatures && typeof org.customFeatures === 'object' && Object.keys(org.customFeatures).length > 0) {
    return org.customFeatures;
  }

  // 2. FALLBACK: Baseline hardcoded defaults to prevent total loss of access if DB settings are missing
  const baselines = {
    free: { projects: true, tasks: true, team: false, chat: false, tickets: false, branding: false, kanban: false, timesheets: false, performance: false },
    starter: { projects: true, tasks: true, team: true, chat: false, tickets: false, branding: false, kanban: true, timesheets: false, performance: false },
    pro: { projects: true, tasks: true, team: true, chat: true, tickets: false, branding: true, kanban: true, timesheets: true, performance: true },
    enterprise: { projects: true, tasks: true, team: true, chat: true, tickets: true, branding: true, kanban: true, timesheets: true, performance: true }
  };

  const planKey = org.plan.toLowerCase(); // 'starter', 'pro', 'enterprise'
  
  // 3. Try to fetch plan defaults from Database settings
  const defaultFeaturesSetting = await prisma.platformSetting.findUnique({
    where: { key: `${planKey}_features` }
  });
  
  // Choose Source: 1. DB, 2. Hardcoded Baseline, 3. Empty Object
  return defaultFeaturesSetting 
    ? JSON.parse(defaultFeaturesSetting.value) 
    : (baselines[planKey] || {});
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Bypass approval check for now as requested (Trial users auto-approved)
  // if (user.role !== 'SUPERADMIN' && !user.isApproved) {
  //   return res.status(403).json({ error: 'Your account is pending admin approval' });
  // }

  // Block login if org is suspended (non-superadmin users)
  if (user.role !== 'SUPERADMIN' && user.organization?.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your organisation account has been suspended. Please contact support.' });
  }

  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const activeFeatures = await getActiveFeatures(user.organization);
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
// Creates a brand-new Organisation + the first ADMIN user in one transaction.
// This is the multi-tenant entry point — each call produces an isolated org.
export const signup = async (req, res) => {
  const {
    // user fields
    name,
    email,
    password,
    // organisation fields (collected at signup)
    organizationName,
    industry,
    size,
    website,
    country,
    timezone,
    role: requestedRole,
  } = req.body;

  // ── validation ────────────────────────────────────────────────────────────
  const role = requestedRole || 'ADMIN';
  
  if (!name || !email || !password || !organizationName) {
    return res.status(400).json({
      error: 'Name, email, password, and organisation name are required',
    });
  }

  // Require additional fields if creating a new organisation (ADMIN role)
  if (role === 'ADMIN') {
    if (!industry || !size || !website || !country) {
      return res.status(400).json({
        error: 'Industry, Company Size, Website, and Country are mandatory for organisation setup.',
      });
    }
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    return res.status(400).json({
      error: 'Name cannot contain special characters. Only alphanumeric characters and spaces are allowed.',
    });
  }

  if (organizationName.trim().length < 2) {
    return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });
  }

  // Check for duplicate organization name
  const existingOrg = await prisma.organization.findFirst({
    where: { name: { equals: organizationName.trim(), mode: 'insensitive' } }
  });

  // ── duplicate email check (scoped to organisation if joining existing) ──
  const existingUserInOrg = existingOrg
    ? await prisma.user.findFirst({ where: { email, organizationId: existingOrg.id } })
    : null;

  if (existingUserInOrg) {
    return res.status(400).json({ error: 'You are already registered with this email in this organisation.' });
  }

  // If org exists and role is ADMIN, it's a conflict
  if (existingOrg && role === 'ADMIN') {
    return res.status(400).json({ error: 'Organisation name is already taken' });
  }

  // If org exists and role is NOT admin, we allow "Pending" signup
  if (existingOrg && role !== 'ADMIN') {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        organizationId: existingOrg.id,
        name,
        email,
        passwordHash,
        role,
        isApproved: false, // Needs admin approval to join existing org
        mustChangePassword: false,
      },
      include: { organization: true },
    });

    const { passwordHash: _ph, ...userWithoutPassword } = user;

    // We don't issue a token yet because they are pending approval
    return res.status(201).json({
      user: userWithoutPassword,
      message: 'Signup successful. Your account is pending approval from the organisation administrator.'
    });
  }

  // ── check if requested by superadmin ─────────────────────────────────────
  let isSuperAdmin = false;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const authHeaderToken = req.headers.authorization.substring(7);
      const decoded = jwt.verify(authHeaderToken, process.env.JWT_SECRET);
      if (decoded.role === 'SUPERADMIN') {
        isSuperAdmin = true;
      }
    } catch (err) {
      // ignore
    }
  }

  // ── create org + admin in a single transaction ────────────────────────────
  const passwordHash = await bcrypt.hash(password, 10);

  // Fetch default trial duration from settings
  const trialDaysSetting = await prisma.platformSetting.findUnique({
    where: { key: 'defaultTrialDays' }
  });
  const trialDays = trialDaysSetting ? parseInt(trialDaysSetting.value) : 14;

  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  const { org, user } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: organizationName.trim(),
        industry: industry || null,
        size: size || null,
        website: website?.trim() || null,
        country: country || null,
        timezone: timezone || 'Asia/Kolkata',
        plan: 'FREE',
        status: 'TRIAL', // Defaults to trial
        trialEndsAt,
        maxUsers: 10,
        maxProjects: 3,
      },
    });

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        name,
        email,
        passwordHash,
        role: 'ADMIN',
        isApproved: true, // No longer needs superadmin approval for Trial
        mustChangePassword: false,
      },
      include: { organization: true },
    });

    return { org, user };
  });

  const { passwordHash: _ph, ...userWithoutPassword } = user;

  // issue JWT automatically for the new trial user
  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Email notification disabled as requested

  res.status(201).json({ token, user: userWithoutPassword });
};

// ── invite ─────────────────────────────────────────────────────────────────
export const invite = async (req, res) => {
  const { email, name, role, password } = req.body;
  const organizationId = req.user.organizationId;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Email, name, and role required' });
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    return res.status(400).json({
      error: 'Name cannot contain special characters. Only alphanumeric characters and spaces are allowed.',
    });
  }

  // ── user seat limit check ─────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { _count: { select: { users: true } } },
  });

  if (org && org._count.users >= org.maxUsers) {
    return res.status(403).json({
      error: `User limit reached. Your plan allows a maximum of ${org.maxUsers} users. Please upgrade your plan.`,
    });
  }

  const existingUserInOrg = await prisma.user.findFirst({
    where: {
      email,
      organizationId
    }
  });
  if (existingUserInOrg) {
    return res.status(400).json({ error: 'User already exists in this organisation' });
  }

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
      mustChangePassword: role !== 'ADMIN',
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      organizationId,
      action: 'INVITED',
      entity: 'user',
      entityId: user.id,
      details: { email, name, role },
    },
  });

  sendMemberInvitationEmail(email, name, finalPassword, role)
    .catch(err => console.error('Failed to send invitation email:', err));

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    user: userWithoutPassword,
    message: 'User invited and credentials sent via email.',
  });
};

// ── changePassword ─────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash, mustChangePassword: false },
  });

  res.json({ message: 'Password updated successfully' });
};

// ── me ─────────────────────────────────────────────────────────────────────
export const me = async (req, res) => {
  const activeFeatures = await getActiveFeatures(req.user.organization);
  const { passwordHash, ...userWithoutPassword } = req.user;
  
  if (userWithoutPassword.organization) {
    userWithoutPassword.organization = { 
      ...userWithoutPassword.organization, 
      activeFeatures 
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

  const user = await prisma.user.findFirst({ where: { email } });

  // Security: don't reveal whether the email exists
  if (!user) {
    return res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  await sendPasswordResetEmail(user.email, user.name, resetLink);

  res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
};

// ── resetPassword ──────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      action: 'PASSWORD_RESET',
      entity: 'USER',
      entityId: user.id,
      details: { message: 'User reset their password via forgot password link' },
    },
  });

  res.json({ message: 'Password has been reset successfully' });
};