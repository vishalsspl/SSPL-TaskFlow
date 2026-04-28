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
    await mainPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log(`⚠️ DB already exists: ${dbName}`);
    } else {
      throw err;
    }
  }

  try {
    console.log("⚙️ Running tenant migration...");
    const prismaCmd = process.platform === "win32" ? "npx prisma" : "./node_modules/.bin/prisma";
    execSync(`${prismaCmd} migrate deploy --schema=prisma/tenant/schema.prisma`, {
      stdio: "inherit",
      env: { ...process.env, TENANT_DATABASE_URL: dbUrl }
    });
  } catch (err) {
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

    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: orgName,
        plan,
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
        maxUsers: 100,
        maxProjects: 100
      }
    });

    let admin = await prisma.user.findFirst({
      where: { email: `admin@${orgName.toLowerCase()}.com` }
    });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          id: uuid(),
          organizationId: orgId,
          name: "Admin User",
          email: `admin@${orgName.toLowerCase()}.com`,
          passwordHash: pwAdmin,
          role: "ADMIN",
          isApproved: true,
          mustChangePassword: false
        }
      });
    }

    let manager = await prisma.user.findFirst({
      where: { email: `manager@${orgName.toLowerCase()}.com` }
    });
    if (!manager) {
      manager = await prisma.user.create({
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
    }

    let member = await prisma.user.findFirst({
      where: { email: `member@${orgName.toLowerCase()}.com` }
    });
    if (!member) {
      member = await prisma.user.create({
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
    }

    let client = await prisma.user.findFirst({
      where: { email: `client@${orgName.toLowerCase()}.com` }
    });
    if (!client) {
      client = await prisma.user.create({
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
    }

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name: "Demo Project",
        managerId: manager.id,
        category: "INTERNAL"
      }
    });

    const task = await prisma.task.create({
      data: {
        title: "Initial Task",
        projectId: project.id,
        status: "TODO"
      }
    });

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
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("🌱 Starting multi-tenant seed...");

  try {
    const superAdmin = await mainPrisma.user.upsert({
      where: { email: "superadmin@sveltoz.com" },
      update: {},
      create: {
        name: "Super Admin",
        email: "superadmin@sveltoz.com",
        passwordHash: await bcrypt.hash("superadmin123", 10),
        role: "SUPERADMIN",
        isApproved: true,
        mustChangePassword: false
      }
    });

    console.log("✅ Superadmin created");

    const orgs = [
      { name: "SSPL", plan: "PRO" },
      { name: "ACME", plan: "STARTER" }
    ];

    for (const orgData of orgs) {
      console.log(`\n🏢 Preparing org: ${orgData.name}`);

      const dbName = `org_${orgData.name.toLowerCase()}`;
      const dbUrl = await setupTenantDB(dbName);

      let org = await mainPrisma.organization.findFirst({
        where: { name: orgData.name }
      });

      if (!org) {
        org = await mainPrisma.organization.create({
          data: {
            name: orgData.name,
            dbUrl,
            dbStrategy: "DEDICATED",
            plan: orgData.plan,
            status: "ACTIVE"
          }
        });
      }

      console.log("✅ Org saved in MAIN DB");

      const adminData = await seedTenant(dbUrl, org.id, orgData.name, orgData.plan);

      await mainPrisma.user.upsert({
        where: { email: adminData.email },
        update: {},
        create: {
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

      console.log("✅ Admin added to MAIN DB");

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