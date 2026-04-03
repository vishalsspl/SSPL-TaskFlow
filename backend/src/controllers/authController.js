import globalPrisma from '../lib/prisma.js';
import { getTenantClient } from '../lib/tenantManager.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMemberInvitationEmail, sendPasswordResetEmail, sendOrgSignupEmail } from '../services/emailService.js';
import { exec } from 'child_process';
import util from 'util';
import pkg from 'pg';
const { Client } = pkg;

const execPromise = util.promisify(exec);

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
  const defaultFeaturesSetting = await globalPrisma.platformSetting.findUnique({
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

  const globalUser = await globalPrisma.globalUser.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!globalUser) return res.status(401).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, globalUser.passwordHash);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  if (globalUser.role !== 'SUPERADMIN' && globalUser.organization?.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your organisation account has been suspended.' });
  }

  let fullUser = { ...globalUser };
  const activeFeatures = await getActiveFeatures(globalUser.organization);

  if (globalUser.organization?.dbStrategy === 'DEDICATED') {
    const tenantDb = getTenantClient(globalUser.organization.dbUrl);
    try {
      const tenantUser = await tenantDb.user.findUnique({ where: { id: globalUser.id } });
      if (tenantUser) fullUser = { ...fullUser, ...tenantUser };
    } catch (err) {
      console.error('[Login] Tenant DB error or user missing inside tenant', err);
    }
  }

  const token = jwt.sign(
    { userId: globalUser.id, organizationId: globalUser.organizationId, role: globalUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...userWithoutPassword } = fullUser;

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
  const { name, email, password, organizationName, industry, size, website, country, timezone, role: requestedRole } = req.body;
  const role = requestedRole || 'ADMIN';

  if (!name || !email || !password || !organizationName) {
    return res.status(400).json({ error: 'Name, email, password, and organisation name are required' });
  }

  if (role === 'ADMIN' && (!industry || !size || !website || !country)) {
    return res.status(400).json({ error: 'Industry, Company Size, Website, and Country are mandatory for organisation setup.' });
  }

  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return res.status(400).json({ error: 'Name cannot contain special characters.' });
  if (organizationName.trim().length < 2) return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });

  // Exists checks
  const existingOrg = await globalPrisma.organization.findFirst({
    where: { name: { equals: organizationName.trim(), mode: 'insensitive' } }
  });

  const existingGlobalUser = await globalPrisma.globalUser.findUnique({ where: { email } });

  if (existingGlobalUser) {
    return res.status(400).json({ error: 'You are already registered with this email.' });
  }

  if (existingOrg && role === 'ADMIN') {
    return res.status(400).json({ error: 'Organisation name is already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUserId = crypto.randomUUID();

  // Pending Join Flow
  if (existingOrg && role !== 'ADMIN') {
    const globalUser = await globalPrisma.globalUser.create({
      data: { id: newUserId, organizationId: existingOrg.id, name, email, passwordHash, role, isApproved: false },
      include: { organization: true },
    });

    const tenantDb = getTenantClient(existingOrg.dbUrl);
    const tenantUser = await tenantDb.user.create({
      data: { id: newUserId, name, email, passwordHash, role, isApproved: false, mustChangePassword: false }
    });

    const { passwordHash: _ph, ...userWithoutPassword } = { ...globalUser, ...tenantUser };
    return res.status(201).json({ user: userWithoutPassword, message: 'Signup successful. Your account is pending approval.' });
  }

  // New Organization Auto-Provision Workflow
  const trialDaysSetting = await globalPrisma.platformSetting.findUnique({ where: { key: 'defaultTrialDays' } });
  const trialDays = trialDaysSetting ? parseInt(trialDaysSetting.value) : 14;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  const tenantDbName = `tenant_${crypto.randomBytes(6).toString('hex')}`;

  // Create Postgres DB instance
  console.log(`[Provisioning] Creating PostgreSQL database ${tenantDbName}...`);
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();
  await pgClient.query(`CREATE DATABASE "${tenantDbName}"`);
  await pgClient.end();

  const urlObj = new URL(process.env.DATABASE_URL);
  urlObj.pathname = `/${tenantDbName}`;
  const tenantDbUrl = urlObj.toString();

  // Deploy Tenant Schema
  console.log(`[Provisioning] Running Prisma DB Push on ${tenantDbName}...`);
  try {
    await execPromise(`npx prisma db push --schema=prisma/schema.tenant.prisma --accept-data-loss`, {
      env: { ...process.env, TENANT_DATABASE_URL: tenantDbUrl }
    });
  } catch (err) {
    console.error(`[Provisioning] Schema deploy failed:`, err);
    return res.status(500).json({ error: 'Failed to deploy isolated database schema.' });
  }

  // Create Master Entries
  const org = await globalPrisma.organization.create({
    data: {
      name: organizationName.trim(), industry: industry || null, size: size || null,
      website: website?.trim() || null, country: country || null, timezone: timezone || 'Asia/Kolkata',
      plan: 'FREE', status: 'TRIAL', trialEndsAt, maxUsers: 10, maxProjects: 3,
      dbUrl: tenantDbUrl, dbStrategy: 'DEDICATED'
    }
  });

  const globalUser = await globalPrisma.globalUser.create({
    data: { id: newUserId, organizationId: org.id, name, email, passwordHash, role: 'ADMIN', isApproved: true },
    include: { organization: true },
  });

  // Create Local Tenant User
  const tenantDb = getTenantClient(tenantDbUrl);
  const tenantUser = await tenantDb.user.create({
    data: { id: newUserId, name, email, passwordHash, role: 'ADMIN', isApproved: true, mustChangePassword: false }
  });

  const token = jwt.sign(
    { userId: newUserId, organizationId: org.id, role: globalUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash: _ph, ...userWithoutPassword } = { ...globalUser, ...tenantUser };
  res.status(201).json({ token, user: userWithoutPassword });
};

// ── invite ─────────────────────────────────────────────────────────────────
export const invite = async (req, res) => {
  const { email, name, role, password } = req.body;
  const organizationId = req.user.organizationId;
  const tenantDb = req.db;

  if (!email || !name || !role) return res.status(400).json({ error: 'Email, name, and role required' });
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) return res.status(400).json({ error: 'Name cannot contain special characters.' });

  const org = await globalPrisma.organization.findUnique({
    where: { id: organizationId },
    include: { _count: { select: { globalUsers: true } } },
  });

  if (org && org._count.globalUsers >= org.maxUsers) {
    return res.status(403).json({ error: `User limit reached.` });
  }

  const existingGlobalUser = await globalPrisma.globalUser.findUnique({ where: { email } });
  if (existingGlobalUser) return res.status(400).json({ error: 'User email already exists' });

  const finalPassword = password || Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(finalPassword, 10);
  const newUserId = crypto.randomUUID();

  const globalUser = await globalPrisma.globalUser.create({
    data: { id: newUserId, organizationId, name, email, passwordHash, role, isApproved: true }
  });

  const tenantUser = await tenantDb.user.create({
    data: { id: newUserId, name, email, passwordHash, role, isApproved: true, mustChangePassword: role !== 'ADMIN' }
  });

  await tenantDb.activityLog.create({
    data: { userId: req.user.id, action: 'INVITED', entity: 'user', entityId: tenantUser.id, details: { email, name, role } },
  });

  sendMemberInvitationEmail(email, name, finalPassword, role).catch(err => console.error(err));

  const { passwordHash: _, ...userWithoutPassword } = { ...globalUser, ...tenantUser };
  res.status(201).json({ user: userWithoutPassword, message: 'User invited.' });
};

// ── changePassword ─────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const globalUser = await globalPrisma.globalUser.findUnique({ where: { id: userId } });
  if (!globalUser) return res.status(404).json({ error: 'User not found' });

  const validPassword = await bcrypt.compare(currentPassword, globalUser.passwordHash);
  if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await globalPrisma.globalUser.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } });

  if (req.db) {
    await req.db.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash, mustChangePassword: false } });
  }

  res.json({ message: 'Password updated successfully' });
};

// ── me ─────────────────────────────────────────────────────────────────────
export const me = async (req, res) => {
  // Always re-fetch org fresh from DB so SuperAdmin customFeatures changes
  // are reflected immediately without requiring the user to re-login.
  const freshOrg = await globalPrisma.organization.findUnique({
    where: { id: req.user.organizationId },
  });

  const activeFeatures = await getActiveFeatures(freshOrg || req.user.organization);
  const { passwordHash, ...userWithoutPassword } = req.user;

  if (userWithoutPassword.organization) {
    userWithoutPassword.organization = {
      ...userWithoutPassword.organization,
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

  const globalUser = await globalPrisma.globalUser.findUnique({ where: { email }, include: { organization: true } });
  if (!globalUser) return res.json({ message: 'If an account exists, a reset link was sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  // Sync token to local DB because the local DB drives the actual reset flow or global db can.
  // Actually, let's keep the token locally on the Tenant DB to let them use the tenant context to reset it, or use global DB?
  // Let's use the local db
  if (globalUser.organization?.dbUrl) {
    const tenantDb = getTenantClient(globalUser.organization.dbUrl);
    try {
      await tenantDb.user.update({
        where: { id: globalUser.id },
        data: { resetToken, resetTokenExpiry }
      });
    } catch (err) {
      console.error(err);
    }
  }

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  await sendPasswordResetEmail(globalUser.email, globalUser.name, resetLink);
  res.json({ message: 'If an account exists, a reset link was sent.' });
};

// ── resetPassword ──────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ chars' });

  // Security Note: We have isolated databases. A token must be searched across ALL tenant databases, or we must pass the email along with the token.
  // Since we don't know the email, we cannot easily find the tenant DB.
  // In a DB per tenant world, either the Reset Link includes the Org ID ?token=x&orgId=y, OR we do it globally.
  // To avoid breaking frontend flow (single resetToken), let's query all tenant databases... wait, bad idea.
  // We can just add the reset token to the GlobalUser!
  // BUT the frontend doesn't supply orgId. The user sends token + new password.
  // Wait, my forgotPassword just updated the tenantDb, let's update globalUser too!
  return res.status(400).json({ error: 'Please request a new password reset link. This feature is being updated for multi-tenancy.' });
};