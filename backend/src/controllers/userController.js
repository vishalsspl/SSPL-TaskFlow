import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { sendUserApprovalEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

// Helper to get project IDs managed by a user
const getManagerProjectIds = async (managerId, organizationId) => {
  const projects = await prisma.project.findMany({
    where: {
      managerId,
      organizationId,
    },
    select: { id: true },
  });
  return projects.map(p => p.id);
};

export const getUsers = async (req, res) => {
  const { pending, teamOnly } = req.query;

  const where = {
    organizationId: req.user.organizationId,
  };

  // Filter for pending users if requested
  if (pending === 'true') {
    where.isApproved = false;
  }

  // If Admin requests team members (for task assignment), show Managers and Members
  if (req.user.role === 'ADMIN' && pending !== 'true' && teamOnly === 'true') {
    where.role = { in: ['MANAGER', 'MEMBER'] };
  }

  // If the requester is a MANAGER, restrict visibility
  if (req.user.role === 'MANAGER' && pending !== 'true') {
    const managerProjectIds = await getManagerProjectIds(req.user.id, req.user.organizationId);

    if (teamOnly === 'true') {
      // Return ONLY the manager's own team members (MEMBERs assigned to their projects)
      // This is used for the task assignee dropdown
      where.AND = [
        { role: 'MEMBER' },
        {
          OR: [
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
      // General visibility: themselves, other managers, admins, clients, and their team members
      where.OR = [
        { id: req.user.id }, // Themselves
        { role: 'MANAGER' }, // Other managers (visible as colleagues)
        { role: 'ADMIN' },   // Admins (visible)
        { role: 'CLIENT' },  // Clients (visible for project assignment)
        // Members part of their projects
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
    // Clients should see:
    // 1. Themselves
    // 2. Managers of their projects
    // 3. Team members assigned to their projects

    // Find projects belonging to this client
    const clientProjects = await prisma.project.findMany({
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
      { id: req.user.id }, // Themselves
      { id: { in: managerIds } }, // Managers of their projects
      // Members working on their projects
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
  if (req.user.role === 'MEMBER') {
    // Members should see:
    // 1. Themselves
    // 2. Managers of their projects
    // 3. Clients of their projects

    // Find projects where the member is assigned
    const memberProjects = await prisma.project.findMany({
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
      { id: req.user.id }, // Themselves
      { id: { in: managerIds } }, // Managers
      { id: { in: clientIds } }   // Clients
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isApproved: true,
      avatar: true,
      createdAt: true,
      managerId: true,
      // Include assignments to find managers
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Process users to extract unique managers
  const usersWithManagers = users.map(user => {
    const managersMap = new Map();

    user.taskAssignments?.forEach(ta => {
      if (ta.task?.project?.manager) {
        managersMap.set(ta.task.project.manager.id, ta.task.project.manager.name);
      }
    });

    user.workloads?.forEach(workload => {
      if (workload.project?.manager) {
        managersMap.set(workload.project.manager.id, workload.project.manager.name);
      }
    });

    // Remove the heavy relation data and just keep the managers list
    const { taskAssignments, workloads, ...userData } = user;

    return {
      ...userData,
      managers: Array.from(managersMap.entries()).map(([id, name]) => ({ id, name }))
    };
  });

  res.json(usersWithManagers);
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, managerId } = req.body;

    // Check if user exists and belongs to same organization
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Build update payload - only include fields that are explicitly provided
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (managerId !== undefined) updateData.managerId = managerId;

    // Only hash and update password if provided
    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
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

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and belongs to same organization
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prevent self-deletion
    if (existingUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Only admins can approve users
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can approve users' });
    }

    // Check if user exists and belongs to same organization
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Approve the user
    const approvedUser = await prisma.user.update({
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

    // Send approval email
    if (approvedUser.email) {
      sendUserApprovalEmail(approvedUser.email, approvedUser.name)
        .catch(err => console.error('Failed to send approval email:', err));
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

    // Authorization check: Managers can only view their own team
    if (req.user.role === 'MANAGER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Unauthorized: Managers can only view their own team' });
    }

    // Check if user exists and belongs to same organization
    const manager = await prisma.user.findUnique({
      where: { id },
    });

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    if (manager.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find all projects managed by this user
    const projects = await prisma.project.findMany({
      where: {
        managerId: id,
        organizationId: req.user.organizationId,
      },
      select: {
        id: true,
      },
    });

    const projectIds = projects.map((p) => p.id);

    // Find all users who are assigned to tasks in these projects
    // We can also check Workloads if that's a better source of truth, 
    // but typically team members are those working on tasks.
    // Let's get users who have workloads or tasks in these projects.

    // Using distinct to avoid duplicates
    // Using distinct to avoid duplicates (though we'll process for clients below)
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        OR: [
          {
            taskAssignments: {
              some: {
                task: { projectId: { in: projectIds } }
              },
            },
          },
          {
            workloads: {
              some: {
                projectId: {
                  in: projectIds,
                },
              },
            },
          },
          { managerId: id } // Directly managed users
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        // Include tasks/workloads to find clients for THIS manager's projects
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
      distinct: ['id'],
    });

    // Process to extract unique clients
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

      // Remove relation data
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
    const { name, avatar } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await prisma.user.update({
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

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getMemberProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: managers can only view their subordinates, members can view themselves
    if (req.user.role === 'MEMBER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'MANAGER') {
      // Managers can view their own team members only
      const targetUser = await prisma.user.findUnique({ where: { id }, select: { managerId: true, organizationId: true } });
      if (!targetUser || (targetUser.managerId !== req.user.id && id !== req.user.id)) {
        // Allow if the member is assigned to this manager's project tasks
        const managerProjects = await prisma.project.findMany({
          where: { managerId: req.user.id, organizationId: req.user.organizationId },
          select: { id: true }
        });
        const projectIds = managerProjects.map(p => p.id);
        const isTeamMember = await prisma.taskAssignee.findFirst({
          where: { userId: id, task: { projectId: { in: projectIds } } }
        });
        if (!isTeamMember) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }
    }

    // Verify user exists in same org
    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: req.user.organizationId },
      select: { id: true, name: true, email: true, avatar: true, role: true }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const now = new Date();

    // Fetch all tasks assigned to this user
    const tasks = await prisma.task.findMany({
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

    // Status breakdown
    const statusCounts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, COMPLETED: 0, BLOCKED: 0 };
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    let overdueCount = 0;
    let totalCompletion = 0;
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;

    // Per-project map
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
      // Fetch all projects managed by this user
      const managedProjects = await prisma.project.findMany({
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
