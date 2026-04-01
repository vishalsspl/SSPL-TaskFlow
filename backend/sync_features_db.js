import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncFeatures() {
    console.log('SYNCING FEATURE DEFAULTS IN LIVE DATABASE...');
    
    const settings = [
        { key: 'starter_features', value: JSON.stringify({ projects: true, kanban: true, tasks: true, team: true, timesheets: false, performance: false, chat: false, tickets: false }) },
        { key: 'pro_features', value: JSON.stringify({ projects: true, kanban: true, tasks: true, team: true, timesheets: true, performance: true, chat: true, tickets: false }) },
        { key: 'enterprise_features', value: JSON.stringify({ projects: true, kanban: true, tasks: true, team: true, timesheets: true, performance: true, chat: true, tickets: true }) },
    ];

    for (const { key, value } of settings) {
        await prisma.platformSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        console.log(`- Synced ${key}`);
    }

    console.log('DONE!');
}

syncFeatures()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
