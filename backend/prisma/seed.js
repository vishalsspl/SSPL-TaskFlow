import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Random data helpers ────────────────────────────────────────────────────
const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Ananya', 'Pari', 'Riya', 'Saanvi', 'Kavya', 'Priya', 'Neha', 'Pooja', 'Sneha'];
const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Mehta', 'Shah', 'Joshi', 'Gupta', 'Nair', 'Desai', 'Iyer', 'Reddy', 'Rao', 'Malhotra'];

const PROJECT_ADJ = ['Alpha', 'Beta', 'Phoenix', 'Quantum', 'Titan', 'Apex', 'NextGen', 'Core', 'Vanguard', 'Synergy'];
const PROJECT_NOUN = ['Redesign', 'Migration', 'Platform', 'Hub', 'System', 'Dashboard', 'Analytics', 'Gateway', 'Infrastructure', 'Module'];

const TASK_VERBS = ['Implement', 'Design', 'Review', 'Test', 'Fix', 'Update', 'Refactor', 'Analyze', 'Deploy', 'Document', 'Optimize', 'Configure'];
const TASK_NOUNS = ['Authentication', 'Database Schema', 'API Endpoints', 'User Interface', 'Login Flow', 'Payment Gateway', 'Search Module', 'Reporting Module', 'Security Protocols', 'Performance', 'Admin Panel', 'Notification System'];

const PHASE_NAMES = ['Discovery', 'Planning', 'Design', 'Development', 'Testing', 'Deployment'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (offsetMin, offsetMax) => {
  const d = new Date();
  d.setDate(d.getDate() + randInt(offsetMin, offsetMax));
  return d;
};
const randName = () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting database seed...');

  // ── Clear all (order matters for FK constraints) ───────────────────────
  await prisma.workLog.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.chatRoomLastSeen.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.workload.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('✅ Cleared existing data');

  // ── Passwords ─────────────────────────────────────────────────────────
  const h = (pw) => bcrypt.hash(pw, 10);
  const pwAdmin = await h('admin123');
  const pwManager = await h('manager123');
  const pwMember = await h('member123');
  const pwClient = await h('client123');
  const pwSuper = await h(process.env.SUPERADMIN_PASSWORD || 'superadmin123');

  // ══════════════════════════════════════════════════════════════════════
  // 1. SUPERADMIN — no org
  // ══════════════════════════════════════════════════════════════════════
  const superAdmin = await prisma.user.create({
    data: {
      organizationId: null,
      name: 'Super Admin',
      email: process.env.SUPERADMIN_EMAIL || 'superadmin@taskflow.com',
      passwordHash: pwSuper,
      role: 'SUPERADMIN',
      isApproved: true,
      mustChangePassword: false,
    },
  });
  console.log('✅ Created superadmin:', superAdmin.email);

  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ══════════════════════════════════════════════════════════════════════
  // 2. ORG 1 — SSPL Technologies  (ACTIVE / PRO)
  //    Rich random data: 5 managers, 20 members, 5 clients
  //    12 projects with phases, tasks, worklogs, time entries
  // ══════════════════════════════════════════════════════════════════════
  const org1 = await prisma.organization.create({
    data: {
      name: 'SSPL Technologies',
      themeColor: '#3B82F6',
      industry: 'Software / SaaS',
      size: '51-200',
      website: 'https://sspl.in',
      country: 'India',
      timezone: 'Asia/Kolkata',
      billingEmail: 'billing@sspl.in',
      plan: 'PRO',
      status: 'ACTIVE',
      maxUsers: 50,
      maxProjects: 20,
      primaryContactName: 'Vishal Sharma',
      primaryContactPhone: '+91 98765 43210',
      address: 'Pune, Maharashtra, India',
      requireApproval: true,
      allowClientSignup: false,
      sessionTimeoutMinutes: 60,
    },
  });

  // Fixed admin
  const admin1 = await prisma.user.create({
    data: {
      organizationId: org1.id,
      name: 'Vishal Sharma',
      email: 'admin@sspl.in',
      passwordHash: pwAdmin,
      role: 'ADMIN',
      isApproved: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin1`,
    },
  });

  // 5 managers
  const managers = [];
  const managerEmails = ['priya.patel', 'rahul.m', 'anjali.s', 'karan.v', 'sneha.j'];
  for (let i = 0; i < 5; i++) {
    const name = randName();
    const m = await prisma.user.create({
      data: {
        organizationId: org1.id,
        name,
        email: `${managerEmails[i]}@sspl.in`,
        passwordHash: pwManager,
        role: 'MANAGER',
        isApproved: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=mgr${i}`,
      },
    });
    managers.push(m);
  }

  // 20 members
  const members = [];
  for (let i = 1; i <= 20; i++) {
    const name = randName();
    const m = await prisma.user.create({
      data: {
        organizationId: org1.id,
        name,
        email: `member${i}@sspl.in`,
        passwordHash: pwMember,
        role: 'MEMBER',
        isApproved: true,
        managerId: managers[i % 5].id,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=mem${i}`,
      },
    });
    members.push(m);
  }

  // 5 clients
  const clients1 = [];
  for (let i = 1; i <= 5; i++) {
    const name = randName();
    const c = await prisma.user.create({
      data: {
        organizationId: org1.id,
        name,
        email: `client${i}@sspl.in`,
        passwordHash: pwClient,
        role: 'CLIENT',
        isApproved: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=cli${i}`,
      },
    });
    clients1.push(c);
  }

  console.log('✅ Created org1 users (1 admin + 5 managers + 20 members + 5 clients)');

  // 12 projects with full random data
  const projects1 = [];
  for (let i = 0; i < 12; i++) {
    const manager = rand(managers);
    const hasClient = Math.random() > 0.4;
    const client = hasClient ? rand(clients1) : null;
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'PLANNING', 'ON_HOLD'];
    const status = rand(statuses);

    let startDate, endDate;
    if (status === 'COMPLETED') {
      startDate = randDate(-180, -90);
      endDate = randDate(-30, -5);
    } else if (status === 'PLANNING') {
      startDate = randDate(10, 30);
      endDate = randDate(60, 150);
    } else {
      startDate = randDate(-60, -10);
      endDate = randDate(30, 120);
    }

    const proj = await prisma.project.create({
      data: {
        organizationId: org1.id,
        name: `${rand(PROJECT_ADJ)} ${rand(PROJECT_NOUN)}`,
        description: `Strategic initiative to ${rand(TASK_VERBS).toLowerCase()} the ${rand(TASK_NOUNS).toLowerCase()}.`,
        category: hasClient ? 'CLIENT' : 'INTERNAL',
        managerId: manager.id,
        clientId: client?.id || null,
        status,
        startDate,
        endDate,
        totalBudget: randInt(50000, 500000),
        usedBudget: status === 'COMPLETED'
          ? randInt(40000, 480000)
          : randInt(5000, 100000),
      },
    });
    projects1.push(proj);

    // Phases (3–5 per project)
    const numPhases = randInt(3, 5);
    const phases = [];
    for (let p = 0; p < numPhases; p++) {
      const phaseStatus = status === 'COMPLETED' ? 'COMPLETED'
        : status === 'PLANNING' ? 'WAITING'
          : p === 0 ? 'COMPLETED'
            : p === 1 ? 'IN_PROGRESS'
              : 'WAITING';

      const phase = await prisma.phase.create({
        data: {
          projectId: proj.id,
          name: PHASE_NAMES[p] || `Phase ${p + 1}`,
          status: phaseStatus,
          order: p + 1,
          startDate: randDate(-30, 0),
          endDate: randDate(10, 60),
          completionPercentage: phaseStatus === 'COMPLETED' ? 100
            : phaseStatus === 'IN_PROGRESS' ? randInt(10, 90)
              : 0,
        },
      });
      phases.push(phase);
    }

    // Tasks (8–20 per project)
    const numTasks = randInt(8, 20);
    const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED'];

    for (let t = 0; t < numTasks; t++) {
      const assignee = Math.random() > 0.15 ? rand(members) : null;
      const phase = rand(phases);
      const taskStatus = status === 'COMPLETED' ? 'COMPLETED' : rand(taskStatuses);
      const priority = rand(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

      const task = await prisma.task.create({
        data: {
          projectId: proj.id,
          phaseId: phase.id,
          title: `${rand(TASK_VERBS)} ${rand(TASK_NOUNS)}`,
          description: 'Complete this task as per the requirements document.',
          status: taskStatus,
          priority,
          storyPoints: randInt(1, 13),
          completionPercentage: taskStatus === 'COMPLETED' ? 100
            : taskStatus === 'TODO' ? 0
              : randInt(10, 90),
          dueDate: randDate(-5, 30),
          tags: [priority.toLowerCase(), phase.name.toLowerCase()],
        },
      });

      // Assign member
      if (assignee) {
        await prisma.taskAssignee.create({
          data: { taskId: task.id, userId: assignee.id },
        });

        // WorkLogs (1–3 per task)
        if (status !== 'PLANNING') {
          const numLogs = randInt(1, 3);
          for (let l = 0; l < numLogs; l++) {
            const minutes = randInt(30, 240);
            await prisma.workLog.create({
              data: {
                userId: assignee.id,
                projectId: proj.id,
                taskId: task.id,
                minutes,
                comment: `Worked on ${task.title.toLowerCase()}`,
                loggedAt: randDate(-60, 0),
              },
            });

            // TimeEntry for timesheets
            await prisma.timeEntry.create({
              data: {
                userId: assignee.id,
                projectId: proj.id,
                taskId: task.id,
                date: randDate(-60, 0),
                hours: parseFloat((minutes / 60).toFixed(2)),
                description: `Logged time for ${task.title}`,
                status: rand(['APPROVED', 'PENDING', 'REJECTED']),
                billable: Math.random() > 0.2,
                isManual: true,
              },
            });
          }
        }
      }
    }

    // Workloads — calculate from tasks
    const allTasks = await prisma.task.findMany({
      where: { projectId: proj.id },
      include: { assignees: true },
    });
    const userCounts = {};
    for (const task of allTasks) {
      for (const a of task.assignees) {
        userCounts[a.userId] = (userCounts[a.userId] || 0) + 1;
      }
    }
    for (const [userId, count] of Object.entries(userCounts)) {
      await prisma.workload.upsert({
        where: { userId_projectId: { userId, projectId: proj.id } },
        update: { workloadPercentage: Math.round((count / allTasks.length) * 100), calculatedAt: new Date() },
        create: { userId, projectId: proj.id, workloadPercentage: Math.round((count / allTasks.length) * 100) },
      });
    }
  }

  console.log('✅ Created org1: 12 projects with phases, tasks, worklogs, time entries, workloads');

  // Tickets for org1
  const ticket1 = await prisma.ticket.create({
    data: {
      organizationId: org1.id,
      clientId: clients1[0].id,
      title: 'Login page not loading on mobile',
      description: 'The login page fails to load on iOS Safari.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });
  await prisma.ticketComment.create({
    data: { ticketId: ticket1.id, userId: admin1.id, message: 'Looking into this now.' },
  });

  await prisma.ticket.create({
    data: {
      organizationId: org1.id,
      clientId: clients1[1].id,
      title: 'Export to PDF not working',
      description: 'Clicking export generates an empty PDF.',
      status: 'OPEN',
      priority: 'MEDIUM',
    },
  });

  // Activity logs for org1
  await prisma.activityLog.createMany({
    data: [
      { userId: admin1.id, action: 'CREATED', entity: 'PROJECT', details: { name: projects1[0].name } },
      { userId: managers[0].id, action: 'CREATED', entity: 'TASK', details: { title: 'Initial task setup' } },
      { userId: members[0].id, action: 'UPDATED', entity: 'TASK', details: { status: 'COMPLETED' } },
      { userId: managers[1].id, action: 'INVITED', entity: 'USER', details: { role: 'MEMBER' } },
    ],
  });

  console.log('✅ Created org1 tickets and activity logs');

  // ══════════════════════════════════════════════════════════════════════
  // 3. ORG 2 — Acme Design Studio  (TRIAL / STARTER)
  // ══════════════════════════════════════════════════════════════════════
  const org2 = await prisma.organization.create({
    data: {
      name: 'Acme Design Studio',
      themeColor: '#8b5cf6',
      industry: 'Design & Creative',
      size: '11-50',
      website: 'https://acmedesign.io',
      country: 'India',
      timezone: 'Asia/Kolkata',
      billingEmail: 'hello@acmedesign.io',
      plan: 'STARTER',
      status: 'TRIAL',
      trialEndsAt: trialEnd,
      maxUsers: 15,
      maxProjects: 8,
      primaryContactName: 'Neha Joshi',
      primaryContactPhone: '+91 99887 76655',
      requireApproval: false,
      allowClientSignup: true,
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      organizationId: org2.id,
      name: 'Neha Joshi',
      email: 'admin@acmedesign.io',
      passwordHash: pwAdmin,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  const member_org2 = await prisma.user.create({
    data: {
      organizationId: org2.id,
      name: 'Karan Verma',
      email: 'karan@acmedesign.io',
      passwordHash: pwMember,
      role: 'MEMBER',
      isApproved: true,
    },
  });

  const client_org2 = await prisma.user.create({
    data: {
      organizationId: org2.id,
      name: 'Sunita Corp',
      email: 'client@acmedesign.io',
      passwordHash: pwClient,
      role: 'CLIENT',
      isApproved: true,
    },
  });

  const proj_org2 = await prisma.project.create({
    data: {
      organizationId: org2.id,
      name: 'Brand Identity Project',
      description: 'Full brand identity for Sunita Corp',
      category: 'CLIENT',
      managerId: admin2.id,
      clientId: client_org2.id,
      status: 'PLANNING',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-06-30'),
      totalBudget: 80000,
      usedBudget: 0,
    },
  });

  console.log('✅ Created org2: Acme Design Studio (TRIAL)');

  // ══════════════════════════════════════════════════════════════════════
  // 4. ORG 3 — RetailPlus  (SUSPENDED)
  // ══════════════════════════════════════════════════════════════════════
  const org3 = await prisma.organization.create({
    data: {
      name: 'RetailPlus',
      themeColor: '#ef4444',
      industry: 'E-commerce / Retail',
      size: '1-10',
      country: 'India',
      billingEmail: 'admin@retailplus.com',
      plan: 'FREE',
      status: 'SUSPENDED',
      suspendedAt: new Date('2026-02-01'),
      suspendedReason: 'Payment overdue for 30 days',
      maxUsers: 10,
      maxProjects: 5,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org3.id,
      name: 'Admin RetailPlus',
      email: 'admin@retailplus.com',
      passwordHash: pwAdmin,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  console.log('✅ Created org3: RetailPlus (SUSPENDED)');

  // ══════════════════════════════════════════════════════════════════════
  // 5. ORG 4 — TechNova Solutions  (ACTIVE / FREE)
  // ══════════════════════════════════════════════════════════════════════
  const org4 = await prisma.organization.create({
    data: {
      name: 'TechNova Solutions',
      themeColor: '#22c55e',
      industry: 'Technology',
      size: '1-10',
      country: 'India',
      billingEmail: 'admin@technova.in',
      plan: 'FREE',
      status: 'ACTIVE',
      maxUsers: 10,
      maxProjects: 5,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org4.id,
      name: 'Amit Kumar',
      email: 'admin@technova.in',
      passwordHash: pwAdmin,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org4.id,
      name: 'Divya Nair',
      email: 'divya@technova.in',
      passwordHash: pwMember,
      role: 'MEMBER',
      isApproved: true,
    },
  });

  console.log('✅ Created org4: TechNova Solutions (FREE)');

  // ══════════════════════════════════════════════════════════════════════
  // 6. INVOICES
  // ══════════════════════════════════════════════════════════════════════
  const orgs = [org1, org2, org4]; // org3 is suspended, maybe no recent invoice?
  for (const org of orgs) {
    const amount = org.plan === 'PRO' ? 49.00 : (org.plan === 'STARTER' ? 19.00 : 0.00);
    if (amount > 0) {
      await prisma.invoice.create({
        data: {
          organizationId: org.id,
          amount,
          status: 'PAID',
          description: `Monthly subscription - ${org.plan} Plan`,
          plan: org.plan,
          paidAt: new Date(),
        }
      });
      // Add one PENDING invoice
      await prisma.invoice.create({
        data: {
          organizationId: org.id,
          amount,
          status: 'PENDING',
          description: `Upcoming subscription - ${org.plan} Plan`,
          plan: org.plan,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      });
    }
  }

  console.log('✅ Created sample invoices');

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑  LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('SUPERADMIN (no org → goes to /superadmin):');
  console.log(`  Email   : ${process.env.SUPERADMIN_EMAIL || 'superadmin@taskflow.com'}`);
  console.log(`  Password: ${process.env.SUPERADMIN_PASSWORD || 'superadmin123'}`);
  console.log('');
  console.log('SSPL Technologies (ACTIVE / PRO — rich data):');
  console.log('  Admin   : admin@sspl.in          / admin123');
  console.log('  Manager : priya.patel@sspl.in    / manager123');
  console.log('  Member  : member1@sspl.in        / member123');
  console.log('  Client  : client1@sspl.in        / client123');
  console.log('');
  console.log('Acme Design Studio (TRIAL / STARTER):');
  console.log('  Admin   : admin@acmedesign.io    / admin123');
  console.log('  Member  : karan@acmedesign.io    / member123');
  console.log('  Client  : client@acmedesign.io   / client123');
  console.log('');
  console.log('RetailPlus (SUSPENDED — login blocked):');
  console.log('  Admin   : admin@retailplus.com   / admin123');
  console.log('');
  console.log('TechNova Solutions (ACTIVE / FREE):');
  console.log('  Admin   : admin@technova.in      / admin123');
  console.log('  Member  : divya@technova.in      / member123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });