import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const updateOrganization = async (req, res) => {
    try {
        const { name, themeColor, logoUrl } = req.body;
        const { organizationId } = req.user;

        // Only admins can update organization settings
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only administrators can update organization settings' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (themeColor !== undefined) updateData.themeColor = themeColor;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

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

export const getPublicOrganization = async (req, res) => {
    try {
        const organization = await prisma.organization.findFirst({
            select: {
                name: true,
                logoUrl: true,
                themeColor: true,
            },
        });
        res.json(organization);
    } catch (error) {
        console.error('Error fetching public organization:', error);
        res.status(500).json({ error: 'Failed to fetch organization info' });
    }
};
