import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

// GET /api/superadmin/stats
export const getStats = async (req, res) => {
    try {
        const [totalOrgs, activeOrgs, trialOrgs, suspendedOrgs, totalUsers] = await Promise.all([
            prisma.organization.count(),
            prisma.organization.count({ where: { status: 'ACTIVE' } }),
            prisma.organization.count({ where: { status: 'TRIAL' } }),
            prisma.organization.count({ where: { status: 'SUSPENDED' } }),
            prisma.user.count(),
        ]);

        const recentOrgs = await prisma.organization.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        res.json({
            stats: {
                totalOrgs,
                activeOrgs,
                trialOrgs,
                suspendedOrgs,
                totalUsers,
            },
            recentOrgs
        });
    } catch (error) {
        console.error('Error fetching superadmin stats:', error);
        res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
};

// POST /api/superadmin/orgs
export const createOrganization = async (req, res) => {
    const { name, industry, size, website, country, timezone, adminName, adminEmail, adminPassword, plan = 'TRIAL' } = req.body;

    if (!name || !adminName || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Name, admin name, admin email, and admin password are required' });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Admin email already registered' });
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch platform settings for limits and features
            const settings = await tx.platformSetting.findMany();
            const s = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

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

            const maxUsers = plan === 'ENTERPRISE' ? getLimit('ENTERPRISE', 'users', 1000) 
                           : (plan === 'PRO' ? getLimit('PRO', 'users', 100) 
                           : (plan === 'STARTER' ? getLimit('STARTER', 'users', 30) : getLimit('FREE', 'users', 10)));

            const maxProjects = plan === 'ENTERPRISE' ? getLimit('ENTERPRISE', 'projects', 500) 
                               : (plan === 'PRO' ? getLimit('PRO', 'projects', 50) 
                               : (plan === 'STARTER' ? getLimit('STARTER', 'projects', 5) : getLimit('FREE', 'projects', 3)));

            const customFeatures = getFeatures(plan);

            // 2. Create Organization
            const org = await tx.organization.create({
                data: {
                    name,
                    industry: industry || null,
                    size: size || null,
                    website: website || null,
                    country: country || null,
                    timezone: timezone || 'Asia/Kolkata',
                    plan: plan || 'FREE',
                    status: 'ACTIVE',
                    maxUsers,
                    maxProjects,
                    customFeatures,
                }
            });

            // 3. Create Admin User
            const user = await tx.user.create({
                data: {
                    name: adminName,
                    email: adminEmail,
                    passwordHash,
                    role: 'ADMIN',
                    organizationId: org.id,
                    isApproved: true,
                }
            });

            return { org, user };
        });

        res.status(201).json({
            message: 'Organization and administrator created successfully',
            organization: result.org,
            admin: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email
            }
        });
    } catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({ error: 'Failed to create organization' });
    }
};

// GET /api/superadmin/orgs
export const getOrganizations = async (req, res) => {
    try {
        const orgs = await prisma.organization.findMany({
            include: {
                _count: {
                    select: { users: true, projects: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(orgs);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
};

// PUT /api/superadmin/orgs/:id
export const updateOrganization = async (req, res) => {
    const { id } = req.params;
    const { plan, status, maxUsers, maxProjects, suspendedReason, customFeatures } = req.body;

    try {
        const updated = await prisma.organization.update({
            where: { id },
            data: {
                ...(plan && { plan }),
                ...(status && { status }),
                ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
                ...(maxProjects !== undefined && { maxProjects: Number(maxProjects) }),
                ...(suspendedReason !== undefined && { suspendedReason }),
                ...(customFeatures !== undefined && { customFeatures }),
                ...(status === 'SUSPENDED' ? { suspendedAt: new Date() } : (status === 'ACTIVE' ? { suspendedAt: null } : {})),
            }
        });

        // Notify connected org users to refresh their permissions/features immediately.
        try {
            if (req.io) {
                req.io.to(`org-${id}`).emit('org-permissions-updated', {
                    organizationId: id,
                    customFeatures: updated.customFeatures || {},
                    plan: updated.plan,
                    status: updated.status,
                    updatedAt: updated.updatedAt,
                });
            }
        } catch (err) {
            console.error('[SuperAdmin] Failed to emit org-permissions-updated:', err?.message || err);
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
};

// PATCH /api/superadmin/orgs/:id/status
export const updateOrganizationStatus = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';

    try {
        const updated = await prisma.organization.update({
            where: { id },
            data: {
                status: newStatus,
                suspendedAt: action === 'suspend' ? new Date() : null,
                suspendedReason: action === 'suspend' ? 'Manual suspension by platform admin' : null,
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error updating organization status:', error);
        res.status(500).json({ error: 'Failed to update organization status' });
    }
};

// GET /api/superadmin/users
export const getGlobalUsers = async (req, res) => {
    const { page = 1, limit = 20, role, search, organizationId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
        const where = {
            ...(role && { role }),
            ...(organizationId && { organizationId }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { organization: { name: { contains: search, mode: 'insensitive' } } }
                ]
            })
        };

        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    organization: {
                        select: { name: true }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { name: 'asc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            data: users,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / Number(limit)),
                currentPage: Number(page),
            }
        });
    } catch (error) {
        console.error('Error fetching global users:', error);
        res.status(500).json({ error: 'Failed to fetch global users' });
    }
};

// POST /api/superadmin/users/:id/force-reset
export const forceResetPassword = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.update({
            where: { id },
            data: { mustChangePassword: true }
        });
        res.json({ message: 'User password reset flags updated' });
    } catch (error) {
        console.error('Error resetting user password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

// DELETE /api/superadmin/users/:id
export const deleteGlobalUser = async (req, res) => {
    const { id } = req.params;
    try {
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (existingUser) {
            await prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    organizationId: existingUser.organizationId,
                    action: 'DELETED',
                    entity: 'user',
                    entityId: id,
                    details: { name: existingUser.name, email: existingUser.email },
                },
            });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// GET /api/superadmin/audit
export const getGlobalAuditLogs = async (req, res) => {
    const { page = 1, limit = 25, action, search, organizationId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
        const where = {
            ...(action && { action }),
            ...(organizationId && { organizationId }),
            ...(search && {
                OR: [
                    { action: { contains: search, mode: 'insensitive' } },
                    { entity: { contains: search, mode: 'insensitive' } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { organization: { name: { contains: search, mode: 'insensitive' } } },
                    ...(search.length >= 3 ? [
                        { details: { string_contains: search } }
                    ] : [])
                ]
            })
        };

        const [logs, totalCount] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                            avatar: true,
                            organization: { select: { name: true } }
                        }
                    },
                    project: { select: { name: true } },
                    organization: { select: { name: true } }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.activityLog.count({ where })
        ]);

        res.json({
            data: logs,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / Number(limit)),
                currentPage: Number(page),
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
