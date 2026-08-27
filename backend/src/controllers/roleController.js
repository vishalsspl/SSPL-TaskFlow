import prisma from '../lib/prisma.js';
import { createNotification } from '../utils/notifications.js';
export const getRoles = async (req, res) => {
  try {
    const db = req.db;
    const roles = await db.customRole.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { name: 'asc' },
    });
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const db = req.db;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const newRole = await db.customRole.create({
      data: {
        organizationId: req.user.organizationId,
        name: name.trim(),
        description: description?.trim(),
        permissions: permissions || {},
      },
    });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'CREATED',
        entity: 'role',
        entityId: newRole.id,
        details: {
          role: newRole.name,
        },
      };

      // 1. Log to tenant DB
      await db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[CreateRole] Activity log failed:', logErr.message);
    }

    res.status(201).json(newRole);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    const db = req.db;

    const existingRole = await db.customRole.findUnique({ where: { id } });
    if (!existingRole || existingRole.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const updatedRole = await db.customRole.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingRole.name,
        description: description !== undefined ? description?.trim() : existingRole.description,
        permissions: permissions !== undefined ? permissions : existingRole.permissions,
      },
    });

    try {
      const changes = {};
      if (updatedRole.name !== existingRole.name) changes.name = updatedRole.name;
      if (updatedRole.description !== existingRole.description) changes.description = updatedRole.description;
      if (JSON.stringify(updatedRole.permissions) !== JSON.stringify(existingRole.permissions)) changes.permissions = 'Updated';

      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'UPDATED',
        entity: 'role',
        entityId: id,
        details: {
          role: updatedRole.name,
          ...changes
        },
      };

      // 1. Log to tenant DB
      await db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[UpdateRole] Activity log failed:', logErr.message);
    }

    res.json(updatedRole);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    const existingRole = await db.customRole.findUnique({ where: { id } });
    if (!existingRole || existingRole.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await db.customRole.delete({ where: { id } });

    try {
      const logData = {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        action: 'DELETED',
        entity: 'role',
        entityId: id,
        details: {
          role: existingRole.name,
        },
      };

      // 1. Log to tenant DB
      await db.activityLog.create({ data: logData });

      // 2. Log to main DB for SuperAdmin visibility
      await prisma.activityLog.create({ data: logData });
    } catch (logErr) {
      console.error('[DeleteRole] Activity log failed:', logErr.message);
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};
