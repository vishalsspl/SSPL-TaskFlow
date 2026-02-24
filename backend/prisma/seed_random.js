import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- Constants & Generators ---

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Margaret', 'Anthony', 'Betty', 'Donald', 'Sandra'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

const PROJECT_ADJECTIVES = ['Alpha', 'Beta', 'Gamma', 'Phoenix', 'Quantum', 'Nebula', 'Titan', 'Apex', 'Global', 'NextGen', 'Strategic', 'Core', 'Vanguard', 'Synergy', 'Eco', 'Cyber'];
const PROJECT_NOUNS = ['Redesign', 'Migration', 'Platform', 'Interface', 'Hub', 'System', 'Network', 'Initiative', 'Protocol', 'Dashboard', 'Analytics', 'Gateway', 'Solutions', 'Infrastructure'];

const TASK_VERBS = ['Implement', 'Design', 'Review', 'Test', 'Fix', 'Update', 'Refactor', 'Analyze', 'Deploy', 'Document', 'Optimize', 'Configure'];
const TASK_NOUNS = ['Authentication', 'Database Schema', 'API Endpoints', 'User Interface', 'Login Flow', 'Payment Gateway', 'Search Functionality', 'Reporting Module', 'Security Protocols', 'Performance', 'Mobile Responsive Layout', 'Admin Panel'];

const PHASES = ['Discovery', 'Planning', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateName = () => `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)} `;

const generateDate = (startOffsetDays, endOffsetDays) => {
    const date = new Date();
    const offset = getRandomInt(startOffsetDays, endOffsetDays);
    date.setDate(date.getDate() + offset);
    return date;
};

// --- Main Seed Function ---

async function main() {
    console.log('🌱 Starting RANDOM database seed...');

    // 1. Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.activityLog.deleteMany();
    await prisma.workload.deleteMany();
    await prisma.task.deleteMany();
    await prisma.phase.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // 2. Create Organization
    console.log('🏢 Creating organization...');
    const org = await prisma.organization.create({
        data: {
            name: 'Sveltoz',
            themeColor: '#0ea5e9', // Sky blue
        },
    });

    // 3. Create Users
    console.log('👥 Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    // Admin
    const admin = await prisma.user.create({
        data: {
            organizationId: org.id,
            name: 'System Admin',
            email: 'admin@example.com',
            passwordHash: adminHash,
            role: 'ADMIN',
            isApproved: true,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
        },
    });

    // Managers (5)
    const managers = [];
    for (let i = 1; i <= 5; i++) {
        const name = generateName();
        const user = await prisma.user.create({
            data: {
                organizationId: org.id,
                name: name,
                email: `manager${i}@example.com`,
                passwordHash,
                role: 'MANAGER',
                isApproved: true,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
            },
        });
        managers.push(user);
    }

    // Members (20)
    const members = [];
    for (let i = 1; i <= 20; i++) {
        const name = generateName();
        const user = await prisma.user.create({
            data: {
                organizationId: org.id,
                name: name,
                email: `member${i}@example.com`,
                passwordHash,
                role: 'MEMBER',
                isApproved: true,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
            },
        });
        members.push(user);
    }

    // Clients (5)
    const clients = [];
    for (let i = 1; i <= 5; i++) {
        const name = generateName();
        const user = await prisma.user.create({
            data: {
                organizationId: org.id,
                name: name,
                email: `client${i}@example.com`,
                passwordHash,
                role: 'CLIENT',
                isApproved: true,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
            },
        });
        clients.push(user);
    }

    // 4. Create Projects
    console.log('🚀 Creating projects...');
    const projects = [];
    for (let i = 0; i < 12; i++) {
        const manager = getRandomElement(managers);
        const client = Math.random() > 0.3 ? getRandomElement(clients) : null;
        const status = Math.random() > 0.7 ? 'COMPLETED' : (Math.random() > 0.2 ? 'ACTIVE' : 'PLANNING');

        // Determine dates based on status
        let startDate = generateDate(-60, 0);
        let endDate = generateDate(10, 90);
        if (status === 'COMPLETED') {
            startDate = generateDate(-120, -60);
            endDate = generateDate(-30, -10);
        } else if (status === 'PLANNING') {
            startDate = generateDate(10, 30);
            endDate = generateDate(60, 120);
        }

        const project = await prisma.project.create({
            data: {
                organizationId: org.id,
                name: `${getRandomElement(PROJECT_ADJECTIVES)} ${getRandomElement(PROJECT_NOUNS)}`,
                description: `A strategic initiative to ${getRandomElement(TASK_VERBS).toLowerCase()} the ${getRandomElement(TASK_NOUNS).toLowerCase()} for improved efficiency.`,
                managerId: manager.id,
                clientId: client?.id,
                status: status,
                startDate: startDate,
                endDate: endDate,
                totalBudget: getRandomInt(5000, 50000),
                usedBudget: status === 'COMPLETED' ? getRandomInt(4000, 48000) : getRandomInt(1000, 20000),
            },
        });
        projects.push(project);

        // 5. Create Phases for Project
        const numPhases = getRandomInt(3, 5);
        const projectPhases = [];
        for (let p = 0; p < numPhases; p++) {
            const phaseName = PHASES[p] || `Phase ${p + 1}`;
            const phaseStatus = status === 'COMPLETED' ? 'COMPLETED' : (status === 'PLANNING' ? 'WAITING' : (Math.random() > 0.5 ? 'COMPLETED' : 'IN_PROGRESS'));

            const phase = await prisma.phase.create({
                data: {
                    projectId: project.id,
                    name: phaseName,
                    status: phaseStatus === 'COMPLETED' ? 'COMPLETED' : (phaseStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'WAITING'),
                    order: p + 1,
                    startDate: generateDate(-10, 10),
                    endDate: generateDate(20, 40),
                    completionPercentage: phaseStatus === 'COMPLETED' ? 100 : (phaseStatus === 'IN_PROGRESS' ? getRandomInt(10, 90) : 0),
                }
            });
            projectPhases.push(phase);
        }

        // 6. Create Tasks for Project
        const numTasks = getRandomInt(8, 20);
        for (let t = 0; t < numTasks; t++) {
            const assignee = Math.random() > 0.2 ? getRandomElement(members) : null;
            const phase = getRandomElement(projectPhases);

            // Task Status Distribution
            const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'];
            let taskStatus = 'TODO';
            if (project.status === 'COMPLETED') {
                taskStatus = 'COMPLETED';
            } else if (project.status === 'ACTIVE') {
                taskStatus = getRandomElement(taskStatuses);
            }

            const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)];

            await prisma.task.create({
                data: {
                    projectId: project.id,
                    phaseId: phase.id,
                    title: `${getRandomElement(TASK_VERBS)} ${getRandomElement(TASK_NOUNS)}`,
                    description: "This task needs to be completed according to the requirements doc.",
                    assignees: {
                        create: assignee ? [{ userId: assignee.id }] : []
                    },
                    status: taskStatus,
                    priority: priority,
                    completionPercentage: taskStatus === 'COMPLETED' ? 100 : (taskStatus === 'TODO' ? 0 : getRandomInt(10, 90)),
                    dueDate: generateDate(-5, 20),
                    tags: [priority.toLowerCase(), phase.name.toLowerCase()],
                }
            });
        }

        // 7. Calculate and Create Workloads
        const projectTasks = await prisma.task.findMany({
            where: { projectId: project.id },
            include: { assignees: true },
        });

        if (projectTasks.length > 0) {
            const userTaskCounts = {};
            for (const task of projectTasks) {
                for (const assignee of task.assignees) {
                    userTaskCounts[assignee.userId] = (userTaskCounts[assignee.userId] || 0) + 1;
                }
            }

            for (const [userId, count] of Object.entries(userTaskCounts)) {
                const percentage = Math.round((count / projectTasks.length) * 100);
                await prisma.workload.create({
                    data: {
                        userId,
                        projectId: project.id,
                        workloadPercentage: percentage,
                    }
                });
            }
        }
    }

    console.log('');
    console.log('🎉 Database seeded successfully with random data!');
    console.log('');
    console.log('--- Login Credentials ---');
    console.log('Admin:    admin@example.com / admin123');
    console.log('Manager:  manager1@example.com / password123');
    console.log('Member:   member1@example.com / password123');
    console.log('Client:   client1@example.com / password123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
