import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const getUsers = async (req, res) => {
  const { pending } = req.query;

  const where = {
    organizationId: req.user.organizationId,
  };

  // Filter for pending users if requested
  if (pending === 'true') {
    where.isApproved = false;
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
      // Include assignments to find managers
      assignedTasks: {
        select: {
          project: {
            select: {
              manager: {
                select: { id: true, name: true }
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

    user.assignedTasks?.forEach(task => {
      if (task.project?.manager) {
        managersMap.set(task.project.manager.id, task.project.manager.name);
      }
    });

    user.workloads?.forEach(workload => {
      if (workload.project?.manager) {
        managersMap.set(workload.project.manager.id, workload.project.manager.name);
      }
    });

    // Remove the heavy relation data and just keep the managers list
    const { assignedTasks, workloads, ...userData } = user;

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
    const { name, email, role, password } = req.body;

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

    // Prepare update data
    const updateData = {
      name,
      role,
    };

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

    res.json(approvedUser);
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

export const getManagedUsers = async (req, res) => {
  try {
    const { id } = req.params;

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
            assignedTasks: {
              some: {
                projectId: {
                  in: projectIds,
                },
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
          }
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        // Include tasks/workloads to find clients for THIS manager's projects
        assignedTasks: {
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

      member.assignedTasks?.forEach(task => {
        if (task.project?.client?.name) {
          clientsSet.add(task.project.client.name);
        }
      });

      member.workloads?.forEach(workload => {
        if (workload.project?.client?.name) {
          clientsSet.add(workload.project.client.name);
        }
      });

      // Remove relation data
      const { assignedTasks, workloads, ...memberData } = member;

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
