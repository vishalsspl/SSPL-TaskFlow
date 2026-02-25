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
  const { pending } = req.query;

  const where = {
    organizationId: req.user.organizationId,
  };

  // Filter for pending users if requested
  if (pending === 'true') {
    where.isApproved = false;
  }

  // If the requester is a MANAGER, restrict visibility
  if (req.user.role === 'MANAGER' && pending !== 'true') {
    // Managers should see:
    // 1. Themselves
    // 2. Members assigned to their projects
    // 3. Other MANAGERS (optional, but good for context - let's keep them visible for now or restricting them if needed. 
    //    User said "not anoter manager member", implying they shouldn't see *members* of other managers.
    //    Let's strictly show only their own team + themselves + other managers (as colleagues) but NOT other managers' private members.)

    // Actually, simply returning "All Users" for a manager exposes everyone.
    // We need to valid constraint.
    // Let's find projects managed by this user.
    const managerProjectIds = await getManagerProjectIds(req.user.id, req.user.organizationId);

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
