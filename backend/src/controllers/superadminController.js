import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { provisionTenantDatabase, dropTenantDatabase } from '../services/tenantProvisioner.js';
import tenantDbManager from '../lib/tenantDbManager.js';

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
        // Check if user already exists in MAIN DB
        const existingUser = await prisma.user.findFirst({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Admin email already registered' });
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        // 1. Fetch platform settings for limits and features
        const settings = await prisma.platformSetting.findMany();
        const s = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

        const getLimit = (planVal, type, hardcoded) => {
            const key = `${planVal.toLowerCase()}_max_${type}`;
            return s[key] ? Number(s[key]) : hardcoded;
        };

        const getFeatures = (planVal) => {
            const key = `${planVal.toLowerCase()}_features`;
            if (!s[key]) return { 
                projects: true, kanban: true, tasks: true, tickets: true, 
                team: true, chat: true, performance: true, timesheets: true, github: true
            };
            try {
                return typeof s[key] === 'string' ? JSON.parse(s[key]) : s[key];
            } catch (e) {
                return { 
                    projects: true, kanban: true, tasks: true, tickets: true, 
                    team: true, chat: true, performance: true, timesheets: true, github: true
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

        // 2. Create Organization in MAIN DB
        const org = await prisma.organization.create({
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
                dbStrategy: 'DEDICATED'
            }
        });

        // 3. Create Admin User in MAIN DB
        const user = await prisma.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                passwordHash,
                role: 'ADMIN',
                organizationId: org.id,
                isApproved: true,
            }
        });

        // 4. Provision Tenant Database (Dynamically)
        let tenantDbUrl = null;
        try {
            tenantDbUrl = await provisionTenantDatabase({
                orgId: org.id,
                orgName: org.name,
                orgData: {
                    id: org.id,
                    name: org.name,
                    industry: org.industry,
                    size: org.size,
                    website: org.website,
                    country: org.country,
                    timezone: org.timezone,
                    plan: org.plan,
                    status: org.status,
                    maxUsers: org.maxUsers,
                    maxProjects: org.maxProjects,
                    customFeatures: org.customFeatures
                },
                adminData: {
                    id: user.id,
                    organizationId: org.id,
                    name: user.name,
                    email: user.email,
                    passwordHash: user.passwordHash,
                    role: user.role,
                    isApproved: true,
                    mustChangePassword: false
                }
            });

            // Update org with the confirmed DB URL in MAIN DB
            await prisma.organization.update({
                where: { id: org.id },
                data: { dbUrl: tenantDbUrl }
            });
        } catch (provisionErr) {
            console.error('[SuperAdmin] Tenant provisioning failed:', provisionErr.message);
            // We keep the org record but it won't have a dbUrl yet. 
            // SuperAdmin can retry or manually set it.
        }

        res.status(201).json({
            message: 'Organization created and database provisioning initiated',
            organization: { ...org, dbUrl: tenantDbUrl },
            admin: {
                id: user.id,
                name: user.name,
                email: user.email
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
                    select: { users: true }
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
    const { name, plan, status, maxUsers, maxProjects, suspendedReason, customFeatures } = req.body;

    try {
        const updated = await prisma.organization.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(plan && { plan }),
                ...(status && { status }),
                ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
                ...(maxProjects !== undefined && { maxProjects: Number(maxProjects) }),
                ...(suspendedReason !== undefined && { suspendedReason }),
                ...(customFeatures !== undefined && { customFeatures }),
                ...(status === 'SUSPENDED' ? { suspendedAt: new Date() } : (status === 'ACTIVE' ? { suspendedAt: null } : {})),
            }
        });

        // ── 🔄 SYNC: Propagate to Tenant DB ─────────────────────────
        if (updated.dbUrl && updated.dbStrategy === 'DEDICATED') {
            try {
                const tenantClient = await tenantDbManager.getClient(updated.dbUrl);
                // Check if organization record exists in tenant DB (it should)
                await tenantClient.organization.update({
                    where: { id },
                    data: {
                        ...(name && { name }),
                        ...(plan && { plan }),
                        ...(status && { status }),
                        ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
                        ...(maxProjects !== undefined && { maxProjects: Number(maxProjects) }),
                        ...(customFeatures !== undefined && { customFeatures }),
                    }
                }).catch(e => console.warn('[SuperAdmin Sync] No matching org in tenant DB:', e.message));
            } catch (tenantErr) {
                console.error('[SuperAdmin Sync] Failed to propagate plan change to tenant DB:', tenantErr.message);
            }
        }


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
        const user = await prisma.user.update({
            where: { id },
            data: { mustChangePassword: true },
            include: { organization: true }
        });

        // Sync to Tenant DB if available
        if (user.organization?.dbUrl) {
            try {
                const tenantClient = await tenantDbManager.getClient(user.organization.dbUrl);
                await tenantClient.user.update({
                    where: { id },
                    data: { mustChangePassword: true }
                });
            } catch (tErr) {
                console.error('[SuperAdmin] Failed to sync force-reset to tenant:', tErr.message);
            }
        }

        // ✅ NEW: Activity Log (SAFE)
        try {
            await prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    organizationId: user.organizationId,
                    action: 'FORCE_PASSWORD_RESET',
                    entity: 'user',
                    entityId: id,
                    details: { name: user.name, email: user.email, triggeredBy: 'SUPERADMIN' }
                }
            });
        } catch (e) {
            console.error('[ForceResetPassword] Log failed:', e.message);
        }

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
        const existingUser = await prisma.user.findUnique({ 
            where: { id },
            include: { organization: true }
        });

        if (existingUser) {
            // Log in MAIN DB Audit
            await prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    organizationId: existingUser.organizationId,
                    action: 'DELETED',
                    entity: 'user',
                    entityId: id,
                    details: { name: existingUser.name, email: existingUser.email, deletedBy: 'SUPERADMIN' },
                },
            });

            // Delete from Tenant DB if available
            if (existingUser.organization?.dbUrl) {
                try {
                    const tenantClient = await tenantDbManager.getClient(existingUser.organization.dbUrl);
                    await tenantClient.user.delete({ where: { id } }).catch(e => console.log('User already gone from tenant'));
                } catch (tErr) {
                    console.error('[SuperAdmin] Failed to delete user from tenant:', tErr.message);
                }
            }
        }

        // Delete from MAIN DB
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// DELETE /api/superadmin/orgs/:id
export const deleteOrganization = async (req, res) => {
    const { id } = req.params;
    try {
        const org = await prisma.organization.findUnique({ where: { id } });
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        // 1. Drop Tenant Database if exists
        if (org.dbUrl) {
            try {
                await dropTenantDatabase(org.id);
            } catch (dropErr) {
                console.error('[SuperAdmin] Failed to drop tenant database:', dropErr.message);
                // We proceed with deleting metadata even if DB drop fails (maybe it was manually deleted)
            }
        }

        // 2. Delete all users associated with this org from MAIN DB
        await prisma.user.deleteMany({ where: { organizationId: id } });

        // 3. Delete organization metadata
        await prisma.organization.delete({ where: { id } });

        res.json({ message: 'Organization and all associated data deleted successfully' });
    } catch (error) {
        console.error('Error deleting organization:', error);
        res.status(500).json({ error: 'Failed to delete organization' });
    }
};

// GET /api/superadmin/audit
export const getGlobalAuditLogs = async (req, res) => {
    const { page = 1, limit = 25, action, search, organizationId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
        const where = {
            action: {
                ...(action && { contains: action, mode: 'insensitive' }),
                notIn: ['SUSPENDED', 'ACTIVATED']
            },
            ...(organizationId && { organizationId }),
            ...(search && {
                OR: [
                    { action: { contains: search, mode: 'insensitive' } },
                    { entity: { contains: search, mode: 'insensitive' } },
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { organization: { name: { contains: search, mode: 'insensitive' } } },
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
                            organization: { select: { name: true } }
                        }
                    },
                    organization: { select: { name: true } }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.activityLog.count({ where })
        ]);

        // Map logs to include project/entity info from details if available (since entities aren't in MAIN DB)
        const mappedLogs = logs.map(log => {
            const l = { ...log };
            if (!l.project && l.details && typeof l.details === 'object') {
                const details = l.details;
                
                // Priority 1: Direct name or projectName in details
                const nameSnippet = details.projectName || (l.entity !== 'task' && (details.name || details.title)) || null;
                
                if (nameSnippet) {
                    l.project = { name: nameSnippet };
                } 
                // Priority 2: Entity specific context
                else if (l.entity === 'chat') {
                    l.project = { name: details.room === 'global' ? 'General Channel' : 'Project Chat' };
                }
                else if (l.entity === 'time_entry' || l.entity === 'worklog') {
                    l.project = { name: `${details.hours || details.minutes || ''} ${details.hours ? 'hours' : 'minutes'} logged` };
                }
            }
            return l;
        });

        res.json({
            data: mappedLogs,
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
