-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address" TEXT,
ADD COLUMN     "allow_client_signup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billing_email" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "max_projects" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "max_users" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "plan" "OrgPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "primary_contact_name" TEXT,
ADD COLUMN     "primary_contact_phone" TEXT,
ADD COLUMN     "require_approval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "session_timeout_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_reason" TEXT,
ADD COLUMN     "timezone" TEXT DEFAULT 'Asia/Kolkata',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "organization_id" DROP NOT NULL;
