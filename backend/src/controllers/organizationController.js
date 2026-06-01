import prisma from '../lib/prisma.js';
import { sendUserApprovalEmail, sendCredentialsUpdatedEmail } from '../services/emailService.js';
import { ensureOrganizationSchema } from '../lib/schemaValidator.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { getDefaultPermissions } from '../config/permissionDefaults.js';

// ── GET /api/organizations/me ──────────────────────────────────────────────
// Returns the current user's organisation with user + project counts
export const getMyOrganization = async (req, res) => {
    const { organizationId, role } = req.user;

    if (role === 'SUPERADMIN') {
        return res.status(403).json({ error: 'Superadmin does not belong to an organisation' });
    }

    // ── Lazy Migration ────────────────────────────────────────────────────────
    await ensureOrganizationSchema(req.db);

    const mainOrg = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!mainOrg) return res.status(404).json({ error: 'Organisation not found' });

    // Try to get user count from tenant DB if it exists
    let userCount = 0;
    try {
        if (req.db) {
            userCount = await req.db.user.count();
        }
    } catch (err) {
        console.error('[getMyOrganization] Could not get user count from tenant DB:', err.message);
    }

    res.json({
        ...mainOrg,
        _count: { users: userCount }
    });
};

// ── GET /api/organizations/public ─────────────────────────────────────────
// Returns basic platform branding — no auth required
export const getPublicOrganization = async (req, res) => {
    res.json({ name: 'TaskFlow', logoUrl: null, themeColor: '#48A111' });
};

// ── PUT /api/organizations/me ──────────────────────────────────────────────
// ADMIN only — update own org's profile + settings
export const updateMyOrganization = async (req, res) => {
    const { organizationId } = req.user;

    // ── Lazy Migration ────────────────────────────────────────────────────────
    await ensureOrganizationSchema(req.db);

    const {
        // identity
        name,
        logoUrl,
        themeColor,
        // profile
        industry,
        size,
        website,
        country,
        timezone,
        // contact & billing
        billingEmail,
        primaryContactName,
        primaryContactPhone,
        address,
        // org-level settings
        allowClientSignup,
        requireApproval,
        sessionTimeoutMinutes,
        shiftSettings,
    } = req.body;

    // DEBUG: Log to file
    try {
        fs.appendFileSync('org_update_debug.log', `[${new Date().toISOString()}] Org: ${organizationId}, Keys: ${Object.keys(req.body).join(', ')}, logoLen: ${logoUrl?.length || 0}\n`);
    } catch (err) {}

    if (name !== undefined && (!name.trim() || name.trim().length < 2)) {
        return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });
    }

    if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
        return res.status(400).json({ error: 'Invalid billing email address' });
    }

    const updateData = {
        ...(name !== undefined && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(themeColor !== undefined && { themeColor }),
        ...(industry !== undefined && { industry }),
        ...(size !== undefined && { size }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
        ...(billingEmail !== undefined && { billingEmail: billingEmail?.trim() || null }),
        ...(primaryContactName !== undefined && { primaryContactName: primaryContactName?.trim() || null }),
        ...(primaryContactPhone !== undefined && { primaryContactPhone: primaryContactPhone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(allowClientSignup !== undefined && { allowClientSignup: Boolean(allowClientSignup) }),
        ...(requireApproval !== undefined && { requireApproval: Boolean(requireApproval) }),
        ...(sessionTimeoutMinutes !== undefined && { sessionTimeoutMinutes: parseInt(sessionTimeoutMinutes) }),
    };

    if (shiftSettings !== undefined) {
        const currentOrg = await req.db.organization.findUnique({ where: { id: organizationId }, select: { customFeatures: true } });
        const existingFeatures = (currentOrg?.customFeatures && typeof currentOrg.customFeatures === 'object') ? currentOrg.customFeatures : {};
        updateData.customFeatures = {
            ...existingFeatures,
            shiftSettings
        };
    }

    // ── 🔄 SYNC: Propagate profile changes to Main DB FIRST for safety ────────────────────────
    try {
        await prisma.organization.update({
            where: { id: organizationId },
            data: updateData
        });
    } catch (syncErr) {
        console.error(`[OrgUpdateSync] Main DB update failed:`, syncErr.message);
        try {
            fs.appendFileSync('sync_error.log', `[${new Date().toISOString()}] Main DB Fail: ${syncErr.message}\n`);
        } catch (e) {}
    }

    // ── 🗄️ TENANT: Update Tenant DB ──────────────────────────────────────────────────────────
    const updated = await req.db.organization.update({
        where: { id: organizationId },
        data: updateData,
        include: {
            _count: { select: { users: true } },
        },
    });

    // ── 📢 BROADCAST: Notify all org users to refresh their branding ─────────────────────────
    try {
        if (req.io) {
            req.io.to(`org-${organizationId}`).emit('org-profile-updated', {
                organizationId,
                logoUrl: updated.logoUrl,
                name: updated.name,
                themeColor: updated.themeColor,
            });
        }
    } catch (err) {
        console.error('[OrgUpdate] Failed to emit socket event:', err.message);
    }

    res.json(updated);
};

// ── GET /api/organizations ─────────────────────────────────────────────────
// SUPERADMIN only — list all organisations with counts + filters
export const getAllOrganizations = async (req, res) => {
    const { page = 1, limit = 20, search, status, plan } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(status && { status }),
        ...(plan && { plan }),
    };

    const [orgs, total] = await Promise.all([
        req.db.organization.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { users: true } },
                users: {
                    where: { role: 'ADMIN' },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { id: true, name: true, email: true },
                }
            },
        }),
        req.db.organization.count({ where }),
    ]);

    res.json({
        data: orgs,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
        },
    });
};

// ── PATCH /api/organizations/:id ───────────────────────────────────────────
// SUPERADMIN only — update plan, status, limits, suspension
export const updateOrgByAdmin = async (req, res) => {
    const { id } = req.params;

    const {
        plan,
        status,
        maxUsers,
        maxProjects,
        suspendedReason,
        trialEndsAt,
        adminId,
        adminName,
        adminEmail,
        adminPassword,
        customFeatures,
    } = req.body;

    // Guard: org must exist
    const existing = await req.db.organization.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Organisation not found' });

    const org = await req.db.organization.update({
        where: { id },
        data: {
            ...(plan !== undefined && { plan }),
            ...(status !== undefined && { status }),
            ...(maxUsers !== undefined && { maxUsers: parseInt(maxUsers) }),
            ...(maxProjects !== undefined && { maxProjects: parseInt(maxProjects) }),
            ...(suspendedReason !== undefined && { suspendedReason }),
            ...(trialEndsAt !== undefined && { trialEndsAt: new Date(trialEndsAt) }),
            ...(customFeatures !== undefined && { customFeatures }),
            // auto-stamp suspendedAt when suspending, clear it when reactivating
            ...(status === 'SUSPENDED' && { suspendedAt: new Date() }),
            ...(status === 'ACTIVE' && { suspendedAt: null, suspendedReason: null }),
        },
        include: {
            _count: { select: { users: true } },
        },
    });

    // ── 🔄 SYNC: Propagate to Tenant DB ─────────────────────────
    if (org.dbUrl && org.dbStrategy === 'DEDICATED') {
        try {
            const tenantClient = await tenantDbManager.getClient(org.dbUrl);
            await tenantClient.organization.update({
                where: { id },
                data: {
                    ...(plan !== undefined && { plan }),
                    ...(status !== undefined && { status }),
                    ...(maxUsers !== undefined && { maxUsers: parseInt(maxUsers) }),
                    ...(maxProjects !== undefined && { maxProjects: parseInt(maxProjects) }),
                    ...(customFeatures !== undefined && { customFeatures }),
                }
            }).catch(e => console.warn('[Admin Org Update Sync] No matching org in tenant DB:', e.message));
        } catch (tenantErr) {
            console.error('[Admin Org Update Sync] Failed to propagate plan change:', tenantErr.message);
        }
    }


    if (existing.status === 'PENDING' && (status === 'TRIAL' || status === 'ACTIVE')) {
        await req.db.user.updateMany({
            where: { organizationId: id, role: 'ADMIN' },
            data: { isApproved: true }
        });

        const admins = await req.db.user.findMany({
            where: { organizationId: id, role: 'ADMIN' }
        });
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        for (const admin of admins) {
            sendUserApprovalEmail(admin.email, admin.name, origin)
                .catch(err => console.error('Failed to send approval email:', err));
        }
    }

    // ── Update Admin Credentials ───────────────────────────
    if (adminId && (adminName || adminEmail || adminPassword)) {
        let updateData = {};
        if (adminName) updateData.name = adminName;
        if (adminEmail) updateData.email = adminEmail;
        if (adminPassword) {
            updateData.passwordHash = await bcrypt.hash(adminPassword, 10);
            updateData.mustChangePassword = true;
        }

        const updatedAdmin = await req.db.user.update({
            where: { id: adminId },
            data: updateData
        });

        // Send Email if changed
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        sendCredentialsUpdatedEmail(updatedAdmin.email, updatedAdmin.name, adminPassword, origin)
            .catch(err => console.error('Failed to send credentials email:', err));
    }

    // Notify connected org users to refresh permissions/features immediately.
    try {
        if (req.io) {
            req.io.to(`org-${id}`).emit('org-permissions-updated', {
                organizationId: id,
                customFeatures: org.customFeatures || {},
                plan: org.plan,
                status: org.status,
                updatedAt: org.updatedAt,
            });
        }
    } catch (err) {
        console.error('[Organizations] Failed to emit org-permissions-updated:', err?.message || err);
    }

    res.json(org);
};

// ── DELETE /api/organizations/:id ──────────────────────────────────────────
// SUPERADMIN only — completely delete organization and all associated data
export const deleteOrganization = async (req, res) => {
    const { id } = req.params;

    const existing = await req.db.organization.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Organisation not found' });

    await req.db.activityLog.create({
        data: {
            userId: req.user.id,
            organizationId: id,
            action: 'DELETED',
            entity: 'organization',
            entityId: id,
            details: { name: existing.name },
        },
    });

    try {
        await req.db.organization.delete({ where: { id } });
        res.json({ message: 'Organisation deleted successfully' });
    } catch (error) {
        console.error('[OrganizationDelete] Error:', error.message);
        res.status(500).json({ error: 'Failed to delete organization. It may have associated records that cannot be removed automatically.' });
    }
};

// ── GET /api/organizations/activity-logs ────────────────────────────────────
// ADMIN only — fetch log history for the current organisation
export const getOrgActivityLogs = async (req, res) => {
    const { page = 1, limit = 25, action, entity, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const { organizationId } = req.user;

    try {
        const where = {
            organizationId,
            ...(action && { action: { contains: action, mode: 'insensitive' } }),
            ...(entity && { entity: { contains: entity, mode: 'insensitive' } }),
            ...(search && {
                OR: [
                    { action: { contains: search, mode: 'insensitive' } },
                    { entity: { contains: search, mode: 'insensitive' } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                ]
            })
        };

        const [logs, total] = await Promise.all([
            req.db.activityLog.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                            role: true
                        }
                    }
                }
            }),
            req.db.activityLog.count({ where })
        ]);

        // Map logs for consistent metadata display
        const mappedLogs = logs.map(log => {
            const l = { ...log };
            if (!l.project && l.details && typeof l.details === 'object') {
                const details = l.details;
                const nameSnippet = details.name || details.projectName || details.title || details.taskTitle;
                if (nameSnippet) {
                    l.project = { name: nameSnippet };
                } else if (l.entity === 'chat') {
                    l.project = { name: details.room === 'global' ? 'General Channel' : 'Project Chat' };
                } else if (l.entity === 'time_entry' || l.entity === 'worklog') {
                    l.project = { name: `${details.hours || details.minutes || ''} ${details.hours ? 'hours' : 'minutes'} logged` };
                }
            }
            return l;
        });

        res.json({
            data: mappedLogs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            }
        });
    } catch (error) {
        console.error('[OrgActivityLogs] Error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};

// ── GET /api/organizations/permissions ──────────────────────────────────────
// Returns the current org's role permissions (merged with defaults)
export const getOrgPermissions = async (req, res) => {
    const { organizationId } = req.user;

    try {
        await ensureOrganizationSchema(req.db);
        const org = await req.db.organization.findUnique({
            where: { id: organizationId },
            select: { rolePermissions: true }
        });

        if (!org) return res.status(404).json({ error: 'Organisation not found' });

        const defaults = getDefaultPermissions();
        const customPermissions = org.rolePermissions || {};

        // Merge custom over defaults
        const merged = {
            MANAGER: { ...defaults.MANAGER, ...(customPermissions.MANAGER || {}) },
            MEMBER: { ...defaults.MEMBER, ...(customPermissions.MEMBER || {}) },
            CLIENT: { ...defaults.CLIENT, ...(customPermissions.CLIENT || {}) },
        };

        res.json(merged);
    } catch (error) {
        console.error('[getOrgPermissions] Error:', error);
        fs.appendFileSync('debug_trace.log', `[getOrgPermissions] Error: ${error.message}\n${error.stack}\n`);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
};

// ── PUT /api/organizations/permissions ──────────────────────────────────────
// ADMIN only — Update role permissions for the organization
export const updateOrgPermissions = async (req, res) => {
    const { organizationId } = req.user;
    const permissions = req.body;

    // Validate body structure
    if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ error: 'Invalid permissions payload' });
    }

    try {
        const updateData = { rolePermissions: permissions };

        // 1. Update Main DB (so it's centrally tracked if needed)
        await ensureOrganizationSchema(prisma);
        await prisma.organization.update({
            where: { id: organizationId },
            data: updateData
        });

        // 2. Update Tenant DB
        await ensureOrganizationSchema(req.db);
        const updated = await req.db.organization.update({
            where: { id: organizationId },
            data: updateData
        });

        // 3. Log Activity
        await req.db.activityLog.create({
            data: {
                userId: req.user.id,
                organizationId,
                action: 'UPDATED',
                entity: 'permissions',
                details: { roles: Object.keys(permissions) }
            }
        });

        // 4. Broadcast to clients
        if (req.io) {
            req.io.to(`org-${organizationId}`).emit('org-permissions-updated', {
                organizationId
            });
        }

        res.json(updated.rolePermissions);
    } catch (error) {
        console.error('[updateOrgPermissions] Error:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
};