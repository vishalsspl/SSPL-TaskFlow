import prisma from '../lib/prisma.js';
import { sendUserApprovalEmail, sendCredentialsUpdatedEmail } from '../services/emailService.js';
import bcrypt from 'bcryptjs';

// ── GET /api/organizations/me ──────────────────────────────────────────────
// Returns the current user's organisation with user + project counts
export const getMyOrganization = async (req, res) => {
    const { organizationId, role } = req.user;

    if (role === 'SUPERADMIN') {
        return res.status(403).json({ error: 'Superadmin does not belong to an organisation' });
    }

    const org = await req.db.organization.findUnique({
        where: { id: organizationId },
        include: {
            _count: { select: { users: true, projects: true } },
        },
    });

    if (!org) return res.status(404).json({ error: 'Organisation not found' });

    res.json(org);
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
    } = req.body;

    if (name !== undefined && (!name.trim() || name.trim().length < 2)) {
        return res.status(400).json({ error: 'Organisation name must be at least 2 characters' });
    }

    if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
        return res.status(400).json({ error: 'Invalid billing email address' });
    }

    const updated = await req.db.organization.update({
        where: { id: organizationId },
        data: {
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
        },
        include: {
            _count: { select: { users: true, projects: true } },
        },
    });

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
                _count: { select: { users: true, projects: true } },
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
            _count: { select: { users: true, projects: true } },
        },
    });

    if (existing.status === 'PENDING' && (status === 'TRIAL' || status === 'ACTIVE')) {
        await req.db.user.updateMany({
            where: { organizationId: id, role: 'ADMIN' },
            data: { isApproved: true }
        });

        const admins = await req.db.user.findMany({
            where: { organizationId: id, role: 'ADMIN' }
        });
        for (const admin of admins) {
            sendUserApprovalEmail(admin.email, admin.name)
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
        sendCredentialsUpdatedEmail(updatedAdmin.email, updatedAdmin.name, adminPassword)
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

    await req.db.organization.delete({ where: { id } });
    
    res.json({ message: 'Organisation deleted successfully' });
};