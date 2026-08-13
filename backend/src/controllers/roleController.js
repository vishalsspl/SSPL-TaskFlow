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

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};
