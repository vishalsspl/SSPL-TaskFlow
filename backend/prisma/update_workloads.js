import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Calculating and updating workloads...');

    // Get all projects
    const projects = await prisma.project.findMany({
        include: {
            tasks: true,
        },
    });

    for (const project of projects) {
        console.log(`Processing project: ${project.name} (${project.id})`);

        const totalTasks = project.tasks.length;
        if (totalTasks === 0) {
            console.log(`  No tasks found. Skipping.`);
            continue;
        }

        // Count tasks per user
        const userTaskCounts = {};
        for (const task of project.tasks) {
            if (task.assignedTo) {
                userTaskCounts[task.assignedTo] = (userTaskCounts[task.assignedTo] || 0) + 1;
            }
        }

        // Calculate percentages and update Workload table
        for (const [userId, count] of Object.entries(userTaskCounts)) {
            const percentage = Math.round((count / totalTasks) * 100);

            console.log(`  User ${userId}: ${count} tasks (${percentage}%)`);

            await prisma.workload.upsert({
                where: {
                    userId_projectId: {
                        userId,
                        projectId: project.id,
                    },
                },
                update: {
                    workloadPercentage: percentage,
                    calculatedAt: new Date(),
                },
                create: {
                    userId,
                    projectId: project.id,
                    workloadPercentage: percentage,
                },
            });
        }
    }

    console.log('✅ Workloads updated successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error updating workloads:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
