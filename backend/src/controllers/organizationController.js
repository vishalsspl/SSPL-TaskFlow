import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const updateOrganization = async (req, res) => {
    try {
        const { name, themeColor } = req.body;
        const { organizationId } = req.user;

        // Only admins can update organization settings
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only administrators can update organization settings' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (themeColor !== undefined) updateData.themeColor = themeColor;

        const updatedOrg = await prisma.organization.update({
            where: { id: organizationId },
            data: updateData,
        });

        res.json(updatedOrg);
    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
};
