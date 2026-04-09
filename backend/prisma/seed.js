import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaClient as TenantClient } from "../generated/tenant-client/index.js";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const mainPrisma = new PrismaClient();

// 🔥 helper to create tenant DB
async function setupTenantDB(dbName) {
  const mainDbUrl = process.env.DATABASE_URL;
  if (!mainDbUrl) throw new Error("DATABASE_URL not found in .env");

  const url = new URL(mainDbUrl);
  url.pathname = `/${dbName}`;
  const dbUrl = url.toString();

  try {
    console.log(`🚀 Creating DB: ${dbName}`);
    // ✅ create DB safely
    await mainPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log(`⚠️ DB already exists: ${dbName}`);
    } else {
      console.error("❌ DB creation failed:", err.message);
      throw err;
    }
  }

  try {
    console.log("⚙️ Running tenant migration...");
    execSync(`npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, {
      stdio: "inherit",
      env: { ...process.env, TENANT_DATABASE_URL: dbUrl }
    });
  } catch (err) {
    console.error("❌ Migration failed");
    throw err;
  }

  return dbUrl;
}

// 🔥 seed tenant data
async function seedTenant(dbUrl, orgId, orgName, plan) {
  const prisma = new TenantClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    const pwAdmin = await bcrypt.hash("admin123", 10);
    const pwManager = await bcrypt.hash("manager123", 10);
    const pwMember = await bcrypt.hash("member123", 10);
    const pwClient = await bcrypt.hash("client123", 10);

    // 0. Create Organization in tenant DB
    await prisma.organization.create({
      data: {
        id: orgId,
        name: orgName,
        plan: plan,
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
        maxUsers: 100,
        maxProjects: 100
      }
    });

    // 1. USERS
    const admin = await prisma.user.create({
      data: {
        id: uuid(), // Generate unique ID instead of letting it default to avoid confusion during seed
        organizationId: orgId,
        name: "Admin User",
        email: `admin@${orgName.toLowerCase()}.com`,
        passwordHash: pwAdmin,
        role: "ADMIN",
        isApproved: true,
        mustChangePassword: false
      }
    });

    const manager = await prisma.user.create({
      data: {
        id: uuid(),
        organizationId: orgId,
        name: "Manager User",
        email: `manager@${orgName.toLowerCase()}.com`,
        passwordHash: pwManager,
        role: "MANAGER",
        isApproved: true,
        mustChangePassword: false
      }
    });

    const member = await prisma.user.create({
      data: {
        id: uuid(),
        organizationId: orgId,
        name: "Member User",
        email: `member@${orgName.toLowerCase()}.com`,
        passwordHash: pwMember,
        role: "MEMBER",
        managerId: manager.id,
        isApproved: true,
        mustChangePassword: false
      }
    });

    const client = await prisma.user.create({
      data: {
        id: uuid(),
        organizationId: orgId,
        name: "Client User",
        email: `client@${orgName.toLowerCase()}.com`,
        passwordHash: pwClient,
        role: "CLIENT",
        isApproved: true,
        mustChangePassword: false
      }
    });

    // 2. PROJECT
    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: "Demo Project",
        managerId: manager.id,
        category: "INTERNAL"
      }
    });

    // 3. TASK (Note: Task does NOT have organizationId directly, it's linked via Project)
    const task = await prisma.task.create({
      data: {
        title: "Initial Task",
        projectId: project.id,
        status: "TODO"
      }
    });

    // 4. ASSIGN
    await prisma.taskAssignee.create({
      data: {
        taskId: task.id,
        userId: member.id
      }
    });

    console.log(`✅ Tenant seeded: ${orgName}`);
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      passwordHash: pwAdmin
    };
  } catch (err) {
    console.error(`❌ Tenant seed failed for ${orgName}:`, err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🌱 Starting multi-tenant seed...");

  try {
    // 🔥 SUPERADMIN (MAIN DB)
    const superAdmin = await mainPrisma.user.upsert({
      where: { email: "superadmin@taskflow.com" },
      update: { 
        role: "SUPERADMIN",
        isApproved: true,
        passwordHash: await bcrypt.hash("superadmin123", 10)
      },
      create: {
        name: "Super Admin",
        email: "superadmin@taskflow.com",
        passwordHash: await bcrypt.hash("superadmin123", 10),
        role: "SUPERADMIN",
        isApproved: true
      }
    });

    console.log("✅ Superadmin created");

    // 🔥 ORGANIZATIONS
    const orgs = [
      { name: "SSPL", plan: "PRO" },
      { name: "ACME", plan: "STARTER" },
      { name: "TECHNOVA", plan: "FREE" }
    ];

    for (const orgData of orgs) {
      console.log(`\n🏢 Preparing org: ${orgData.name}`);

      const dbName = `org_${uuid().replace(/-/g, "")}`;

      // 1. Create tenant DB + migrations
      const dbUrl = await setupTenantDB(dbName);

      // 2. Save org in main DB
      const org = await mainPrisma.organization.create({
        data: {
          name: orgData.name,
          dbUrl,
          dbStrategy: "DEDICATED",
          plan: orgData.plan,
          status: "ACTIVE"
        }
      });

      console.log("✅ Org saved in MAIN DB");

      // 3. Seed tenant DB
      const adminData = await seedTenant(dbUrl, org.id, orgData.name, orgData.plan);

      // 4. Register admin in MAIN DB (auth lookup)
      await mainPrisma.user.create({
        data: {
          id: adminData.id,
          organizationId: org.id,
          name: adminData.name,
          email: adminData.email,
          passwordHash: adminData.passwordHash,
          role: "ADMIN",
          isApproved: true,
          mustChangePassword: false
        }
      });
      console.log("✅ Admin added to MAIN DB lookup");

      // 5. Create initial invoice
      await mainPrisma.invoice.create({
        data: {
          organizationId: org.id,
          amount: orgData.plan === "PRO" ? 225000 : 15000,
          status: "PAID",
          description: "Initial Plan Setup"
        }
      });

      console.log("✅ Invoice created");
    }

    console.log("\n🎉 ALL TENANTS SEEDED SUCCESSFULLY!");

  } catch (err) {
    console.error("❌ SEED FAILED:", err);
  } finally {
    await mainPrisma.$disconnect();
  }
}

main();