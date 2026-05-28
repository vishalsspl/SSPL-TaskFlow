import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

import { sendUserApprovalEmail, sendTeamAssignmentEmail, sendUserRejectionEmail, sendRoleChangeEmail } from '../services/emailService.js';
import { createNotification } from '../utils/notifications.js';

// Helper to get project IDs managed by a user
const getManagerProjectIds = async (db, managerId, organizationId) => {
  const projects = await db.project.findMany({
    where: {
      managerId,
      organizationId,
    },
    select: { id: true },
  });
  return projects.map(p => p.id);
};

export const getUsers = async (req, res) => {
  const { pending, teamOnly, search, page, limit: rawLimit, roleFilter } = req.query;
  const db = req.db;

  const where = {
    organizationId: req.user.organizationId,
  };

  // Explicit role filtering (from frontend tabs)
  if (roleFilter) {
    where.role = roleFilter;
  }

  // Filter for pending users if requested
  if (pending === 'true') {
    where.isApproved = false;
  } else {
    where.isApproved = true;
  }

  if (req.user.role === 'ADMIN' && pending !== 'true' && teamOnly === 'true') {
    where.role = { in: ['ADMIN', 'MANAGER', 'MEMBER'] };
  }

  // If the requester is a MANAGER, restrict visibility
  if (req.user.role === 'MANAGER' && pending !== 'true' && req.query.orgMembersOnly !== 'true') {
    const managerProjectIds = await getManagerProjectIds(db, req.user.id, req.user.organizationId);

    if (teamOnly === 'true') {
      where.AND = [
        { role: { in: ['MANAGER', 'MEMBER'] } },
        {
          OR: [
            { id: req.user.id },
            { managerId: req.user.id },
            {
              taskAssignments: {
                some: {
                  task: { projectId: { in: managerProjectIds } }
                }
              }
            },
            {
              workloads: {
                some: {
                  projectId: { in: managerProjectIds }
                }
              }
            }
          ]
        }
      ];
    } else {
      where.OR = [
        { id: req.user.id },
        { role: 'MANAGER' },
        { role: 'ADMIN' },
        { role: 'CLIENT' },
        { role: 'MEMBER' }, // Managers should see all members in the org
        { managerId: req.user.id }, // And specifically their own team
        {
          taskAssignments: {
            some: {
              task: { projectId: { in: managerProjectIds } }
            }
          }
        },
        {
          workloads: {
            some: {
              projectId: { in: managerProjectIds }
            }
          }
        }
      ];
    }
  }

  // If the requester is a CLIENT, restrict visibility
  if (req.user.role === 'CLIENT') {
    const clientProjects = await db.project.findMany({
      where: {
        clientId: req.user.id,
        organizationId: req.user.organizationId,
      },
      select: {
        id: true,
        managerId: true,
      },
    });

    const projectIds = clientProjects.map(p => p.id);
    const managerIds = clientProjects.map(p => p.managerId).filter(id => id !== null);

    where.OR = [
      { id: req.user.id },
      { id: { in: managerIds } },
      {
        taskAssignments: {
          some: {
            task: { projectId: { in: projectIds } }
          }
        }
      },
      {
        workloads: {
          some: {
            projectId: { in: projectIds }
          }
        }
      }
    ];
  }

  // If the requester is a MEMBER, restrict visibility
  if (req.user.role === 'MEMBER' && req.query.orgMembersOnly !== 'true') {
    const memberProjects = await db.project.findMany({
      where: {
        organizationId: req.user.organizationId,
        OR: [
          {
            tasks: {
              some: {
                assignees: { some: { userId: req.user.id } }
              }
            }
          },
          {
            workloads: {
              some: {
                userId: req.user.id
              }
            }
          }
        ]
      },
      select: {
        managerId: true,
        clientId: true
      }
    });

    const managerIds = memberProjects.map(p => p.managerId).filter(id => id !== null);
    const clientIds = memberProjects.map(p => p.clientId).filter(id => id !== null);

    where.OR = [
      { id: req.user.id },
      { id: { in: managerIds } },
      { id: { in: clientIds } }
    ];
  }

  // Handle orgMembersOnly explicitly for Chat Search
  if (req.query.orgMembersOnly === 'true') {
    where.role = { in: ['ADMIN', 'MANAGER', 'MEMBER'] };
    delete where.OR; // remove any previous strict visibility rules
  }

  // Backend search filter
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const selectFields = {
    id: true,
    name: true,
    email: true,
    role: true,
    isApproved: true,
    avatar: true,
    createdAt: true,
    managerId: true,
    manager: { select: { id: true, name: true } },
    taskAssignments: {
      select: {
        task: {
          select: {
            project: {
              select: {
                manager: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    },
    workloads: {
      select: {
        project: {
          select: {
            manager: {
              select: { id: true, name: true }
            }
          }
        }
      }
    }
  };

  // Process users to extract unique managers
  const addManagers = (users) => {
    return users.map(user => {
      const managersMap = new Map();

      // Include direct manager if assigned
      if (user.manager) {
        managersMap.set(user.manager.id, user.manager.name);
      }

      const { taskAssignments, workloads, manager, ...userData } = user;

      return {
        ...userData,
        managers: Array.from(managersMap.entries()).map(([id, name]) => ({ id, name }))
      };
    });
  };

  // If page is provided, return paginated response
  if (page) {
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.max(1, parseInt(rawLimit) || 10);
    const skip = (pageNum - 1) * limit;

    const countsWhere = { ...where };
    delete countsWhere.role;

    const [users, total, roleCounts] = await Promise.all([
      db.user.findMany({
        where,
        select: selectFields,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
      db.user.groupBy({
        by: ['role'],
        where: { ...countsWhere, isApproved: true },
        _count: { _all: true },
      }),
    ]);

    const counts = {
      MANAGER: roleCounts.find(rc => rc.role?.toUpperCase() === 'MANAGER')?._count._all || 0,
      MEMBER: roleCounts.find(rc => rc.role?.toUpperCase() === 'MEMBER')?._count._all || 0,
      CLIENT: roleCounts.find(rc => rc.role?.toUpperCase() === 'CLIENT')?._count._all || 0,
      ALL: roleCounts.reduce((acc, rc) => acc + (rc.role?.toUpperCase() !== 'ADMIN' ? rc._count._all : 0), 0),
    };

    return res.json({
      data: addManagers(users),
      pagination: {
        total,
        page: pageNum,
        limit,
        totalPages: Math.ceil(total / limit),
        counts,
      },
    });
  }

  // No pagination - return all (backward compat for dropdowns)
  const users = await db.user.findMany({
    where,
    select: selectFields,
    orderBy: {
      name: 'asc',
    },
  });

  res.json(addManagers(users));
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, managerId } = req.body;
    const db = req.db;

    if (name !== undefined && !/^[a-zA-Z0-9\s]+$/.test(name)) {
      return res.status(400).json({ error: 'Name cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
    }

    // Check if user exists in tenant DB
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Build update payload
    const updateData = {};
    let isManagerAssigned = false;
    let newManager = null;

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (managerId !== undefined) {
      if (managerId) {
        newManager = await db.user.findFirst({
          where: { id: managerId, organizationId: req.user.organizationId, role: 'MANAGER' }
        });
        if (!newManager) return res.status(400).json({ error: 'Invalid manager for this organization' });

        if (existingUser.managerId !== managerId && (role === 'MEMBER' || (role === undefined && existingUser.role === 'MEMBER'))) {
          isManagerAssigned = true;
        }
      }
      updateData.managerId = managerId;
    }

    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update in tenant DB
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    // Sync core fields to MAIN DB (name, role, password)
    // Using upsert to handle cases where user might be missing from MAIN DB (auto-heal)
    try {
      const mainUpdate = {};
      if (name !== undefined) mainUpdate.name = name;
      if (role !== undefined) mainUpdate.role = role;
      if (updateData.passwordHash) mainUpdate.passwordHash = updateData.passwordHash;

      if (Object.keys(mainUpdate).length > 0) {
        // We use upsert to ensure that if the user is missing from Main DB, they are recreated
        // This handles synchronization issues gracefully
        await prisma.user.upsert({
          where: { id },
          update: mainUpdate,
          create: {
            id,
            organizationId: req.user.organizationId,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            passwordHash: updateData.passwordHash || existingUser.passwordHash,
            isApproved: existingUser.isApproved || true,
            mustChangePassword: existingUser.mustChangePassword || false
          }
        });
      }
    } catch (syncErr) {
      console.error('[UpdateUser] Failed to sync/upsert to MAIN DB:', syncErr.message);
      return res.status(500).json({ error: 'Failed to synchronize account changes to the auth database. User may need to re-login.' });
    }

    // ✅ NEW: Activity Log (Sync to Main DB)
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'UPDATED',
        entity: 'user',
        entityId: id,
        details: {
          name: updatedUser.name,
          email: updatedUser.email,
        },
      };

      // 1. Log to tenant DB
      await db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[UpdateUser] Activity log failed:', logErr.message);
    }

    if (isManagerAssigned && newManager && updatedUser.email) {
      const teamMembers = await db.user.findMany({
        where: { managerId: newManager.id, role: 'MEMBER' },
        select: { name: true, email: true }
      });

      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      sendTeamAssignmentEmail(updatedUser.email, updatedUser.name, newManager.name, teamMembers, origin)
        .catch(err => console.error('Failed to send team assignment email:', err));
    }

    if (role !== undefined && role !== existingUser.role) {
      // Always send an internal application notification for the role change
      await createNotification(req, {
        userId: updatedUser.id,
        title: 'Role Updated',
        message: `Your account role has been changed from ${existingUser.role} to ${role} by the Admin.`,
        type: 'ROLE_UPDATED'
      });

      // Send email if user has an email
      if (updatedUser.email) {
        const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
        sendRoleChangeEmail(updatedUser.email, updatedUser.name, role, origin)
          .catch(err => console.error('Failed to send role change email:', err));
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: Only administrators can delete users.' });
    }

    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (existingUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.activityLog.create({
      data: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'DELETED',
        entity: 'user',
        entityId: id,
        details: { name: existingUser.name, email: existingUser.email },
      },
    });

    // Delete from tenant DB
    await db.user.delete({ where: { id } });

    // Delete from MAIN DB
    try {
      await prisma.user.delete({ where: { id } });
    } catch (mainErr) {
      console.error('[DeleteUser] Failed to delete from MAIN DB:', mainErr.message);
    }

    // ✅ Send Rejection Email if user was pending
    if (!existingUser.isApproved && existingUser.email) {
      console.log(`[DeleteUser] Triggering rejection email for: ${existingUser.email} (was pending)`);
      try {
        await sendUserRejectionEmail(existingUser.email, existingUser.name);
      } catch (err) {
        console.error('[DeleteUser] Critical failure sending rejection email:', err);
      }
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can approve users' });
    }

    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Approve in tenant DB
    const approvedUser = await db.user.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        avatar: true,
        createdAt: true,
      },
    });

    // Sync approval to MAIN DB
    try {
      await prisma.user.update({
        where: { id },
        data: { isApproved: true },
      });
    } catch (syncErr) {
      console.error('[ApproveUser] Failed to sync to MAIN DB:', syncErr.message);
    }

    // Activity Log (Sync to Main DB)
    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'APPROVED',
        entity: 'user',
        entityId: id,
        details: { name: approvedUser.name, email: approvedUser.email },
      };

      // 1. Log to tenant DB
      await db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[ApproveUser] Log failed:', logErr.message);
    }

    if (approvedUser.email) {
      console.log(`[ApproveUser] Triggering approval email for: ${approvedUser.email}`);
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.CLIENT_URL;
      try {
        await sendUserApprovalEmail(approvedUser.email, approvedUser.name, origin);
      } catch (err) {
        console.error('[ApproveUser] Critical failure sending approval email:', err);
      }
    }

    res.json(approvedUser);
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

export const getManagedUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    if (req.user.role === 'MANAGER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Unauthorized: Managers can only view their own team' });
    }

    const manager = await db.user.findUnique({
      where: { id },
    });

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    if (manager.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const projects = await db.project.findMany({
      where: {
        managerId: id,
        organizationId: req.user.organizationId,
      },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    const { search } = req.query;

    const where = {
      organizationId: req.user.organizationId,
      isApproved: true,
      managerId: id
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const teamMembers = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        taskAssignments: {
          where: {
            task: { projectId: { in: projectIds } }
          },
          select: {
            task: {
              select: {
                project: {
                  select: {
                    client: { select: { name: true } }
                  }
                }
              }
            }
          }
        },
        workloads: {
          where: {
            projectId: { in: projectIds }
          },
          select: {
            project: {
              select: {
                client: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      distinct: ['id'],
    });

    const membersWithClients = teamMembers.map(member => {
      const clientsSet = new Set();

      member.taskAssignments?.forEach(ta => {
        if (ta.task?.project?.client?.name) {
          clientsSet.add(ta.task.project.client.name);
        }
      });

      member.workloads?.forEach(workload => {
        if (workload.project?.client?.name) {
          clientsSet.add(workload.project.client.name);
        }
      });

      const { taskAssignments, workloads, ...memberData } = member;

      return {
        ...memberData,
        clients: Array.from(clientsSet)
      };
    });

    res.json(membersWithClients);
  } catch (error) {
    console.error('Error fetching managed users:', error);
    res.status(500).json({ error: 'Failed to fetch managed users' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, avatar, email } = req.body;
    const userId = req.user.id;
    const db = req.db;

    if (name !== undefined && !/^[a-zA-Z0-9\s]+$/.test(name)) {
      return res.status(400).json({ error: 'Name cannot contain special characters. Only alphanumeric characters and spaces are allowed.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (email !== undefined && req.user.role === 'ADMIN') {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      
      // Check if email already in use in MAIN DB
      const existingMainUser = await prisma.user.findUnique({ where: { email } });
      if (existingMainUser && existingMainUser.id !== userId) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
      
      updateData.email = email;
    }

    // Update in tenant DB
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            themeColor: true,
          }
        }
      },
    });

    // Sync to MAIN DB
    const mainUpdate = {};
    if (name !== undefined) mainUpdate.name = name;
    if (updateData.email) mainUpdate.email = updateData.email;

    if (Object.keys(mainUpdate).length > 0) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: mainUpdate,
        });
      } catch (syncErr) {
        console.error('[UpdateProfile] Failed to sync to MAIN DB:', syncErr.message);
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getMemberProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    // Authorization: managers can only view their subordinates, members can view themselves
    if (req.user.role === 'MEMBER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'MANAGER') {
      const targetUser = await db.user.findUnique({ where: { id }, select: { managerId: true, organizationId: true } });
      if (!targetUser || (targetUser.managerId !== req.user.id && id !== req.user.id)) {
        const managerProjects = await db.project.findMany({
          where: { managerId: req.user.id, organizationId: req.user.organizationId },
          select: { id: true }
        });
        const projectIds = managerProjects.map(p => p.id);
        const isTeamMember = await db.taskAssignee.findFirst({
          where: { userId: id, task: { projectId: { in: projectIds } } }
        });
        if (!isTeamMember) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }
    }

    // Verify user exists in same org
    const targetUser = await db.user.findFirst({
      where: { id, organizationId: req.user.organizationId },
      select: { id: true, name: true, email: true, avatar: true, role: true }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const now = new Date();

    // Fetch all tasks assigned to this user
    const tasks = await db.task.findMany({
      where: {
        assignees: { some: { userId: id } },
        project: { organizationId: req.user.organizationId }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        completionPercentage: true,
        dueDate: true,
        storyPoints: true,
        project: { select: { id: true, name: true } }
      }
    });

    const statusCounts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, COMPLETED: 0, BLOCKED: 0 };
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    let overdueCount = 0;
    let totalCompletion = 0;
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;

    const projectMap = {};

    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
      totalCompletion += task.completionPercentage || 0;
      totalStoryPoints += task.storyPoints || 0;
      if (task.status === 'COMPLETED') completedStoryPoints += task.storyPoints || 0;
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED') {
        overdueCount++;
      }

      const pId = task.project.id;
      if (!projectMap[pId]) {
        projectMap[pId] = {
          projectId: pId,
          projectName: task.project.name,
          total: 0, completed: 0, inProgress: 0, todo: 0, blocked: 0, inReview: 0
        };
      }
      projectMap[pId].total++;
      if (task.status === 'COMPLETED') projectMap[pId].completed++;
      else if (task.status === 'IN_PROGRESS') projectMap[pId].inProgress++;
      else if (task.status === 'TODO') projectMap[pId].todo++;
      else if (task.status === 'BLOCKED') projectMap[pId].blocked++;
      else if (task.status === 'IN_REVIEW') projectMap[pId].inReview++;
    }

    const totalTasks = tasks.length;
    const avgCompletion = totalTasks > 0 ? Math.round(totalCompletion / totalTasks) : 0;
    const completionRate = totalTasks > 0 ? Math.round((statusCounts.COMPLETED / totalTasks) * 100) : 0;

    let managementData = null;

    if (targetUser.role === 'MANAGER' || targetUser.role === 'ADMIN') {
      const managedProjects = await db.project.findMany({
        where: { managerId: id, organizationId: req.user.organizationId },
        include: {
          tasks: {
            select: {
              status: true,
              priority: true,
              completionPercentage: true,
              dueDate: true,
              storyPoints: true,
            }
          }
        }
      });

      const mStatusCounts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, COMPLETED: 0, BLOCKED: 0 };
      const mPriorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      let mOverdueCount = 0;
      let mTotalCompletion = 0;
      let mTotalStoryPoints = 0;
      let mCompletedStoryPoints = 0;
      let mTotalTasks = 0;

      managedProjects.forEach(project => {
        project.tasks.forEach(task => {
          mTotalTasks++;
          mStatusCounts[task.status] = (mStatusCounts[task.status] || 0) + 1;
          mPriorityCounts[task.priority] = (mPriorityCounts[task.priority] || 0) + 1;
          mTotalCompletion += task.completionPercentage || 0;
          mTotalStoryPoints += task.storyPoints || 0;
          if (task.status === 'COMPLETED') mCompletedStoryPoints += task.storyPoints || 0;
          if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED') {
            mOverdueCount++;
          }
        });
      });

      managementData = {
        projectCount: managedProjects.length,
        totalTasks: mTotalTasks,
        statusCounts: mStatusCounts,
        priorityCounts: mPriorityCounts,
        overdueCount: mOverdueCount,
        avgCompletion: mTotalTasks > 0 ? Math.round(mTotalCompletion / mTotalTasks) : 0,
        completionRate: mTotalTasks > 0 ? Math.round((mStatusCounts.COMPLETED / mTotalTasks) * 100) : 0,
        totalStoryPoints: mTotalStoryPoints,
        completedStoryPoints: mCompletedStoryPoints,
      };
    }

    res.json({
      user: targetUser,
      individual: {
        totalTasks,
        statusCounts,
        priorityCounts,
        overdueCount,
        avgCompletion,
        completionRate,
        totalStoryPoints,
        completedStoryPoints,
        projectBreakdown: Object.values(projectMap)
      },
      management: managementData
    });
  } catch (error) {
    console.error('Error fetching member progress:', error);
    res.status(500).json({ error: 'Failed to fetch member progress' });
  }
};
