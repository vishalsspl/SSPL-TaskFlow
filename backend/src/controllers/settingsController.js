import prisma from '../lib/prisma.js';

/**
 * GET /api/superadmin/settings
 */
export const getPlatformSettings = async (req, res) => {
    try {
        const settings = await prisma.platformSetting.findMany();
        // Convert array to object for easier frontend consumption
        const settingsObj = settings.reduce((acc, current) => {
            acc[current.key] = current.value;
            return acc;
        }, {});

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching platform settings:', error);
        res.status(500).json({ error: 'Failed to fetch platform settings' });
    }
};

/**
 * PUT /api/superadmin/settings
 */
export const updatePlatformSettings = async (req, res) => {
    const settings = req.body; // Expecting { key: value, ... }

    try {
        const upserts = Object.entries(settings).map(([key, value]) => {
            return prisma.platformSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        });

        await Promise.all(upserts);
        res.json({ message: 'Platform settings updated successfully' });
    } catch (error) {
        console.error('Error updating platform settings:', error);
        res.status(500).json({ error: 'Failed to update platform settings' });
    }
};

/**
 * GET /api/public/settings
 * Returns only non-sensitive platform settings (prices, limits)
 */
export const getPublicSettings = async (req, res) => {
    try {
        const publicKeys = [
            'platformName',
            'supportEmail',
            'starter_max_users', 'starter_max_projects', 'starter_price', 'starter_per_user_price',
            'pro_max_users', 'pro_max_projects', 'pro_price', 'pro_per_user_price',
            'enterprise_max_users', 'enterprise_max_projects', 'enterprise_price',
            'annual_discount_percent',
            'global_plan_tiers'
        ];

        const settings = await prisma.platformSetting.findMany({
            where: { key: { in: publicKeys } }
        });

        const settingsObj = settings.reduce((acc, current) => {
            acc[current.key] = current.value;
            return acc;
        }, {});

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
};
