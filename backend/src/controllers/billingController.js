import prisma from '../lib/prisma.js';
import { notifyPlanRenewalOrUpgrade } from './paymentController.js';

/**
 * GET /api/superadmin/billing/invoices
 * Fetch all invoices with organization details
 */
export const getGlobalInvoices = async (req, res) => {
    const { status, organizationId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
        // Automatically sync PENDING invoices that are past their due date to OVERDUE
        await prisma.invoice.updateMany({
            where: {
                status: 'PENDING',
                dueDate: { lt: new Date() }
            },
            data: {
                status: 'OVERDUE'
            }
        });

        const where = {
            ...(status && { status }),
            ...(organizationId && { organizationId }),
            NOT: {
                status: 'PENDING',
                stripeSessionId: { not: null }
            }
        };

        const [invoices, totalCount] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    organization: {
                        include: {
                            _count: {
                                select: { users: true }
                            },
                            users: {
                                where: { role: 'ADMIN' },
                                select: { email: true },
                                take: 1
                            }
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.invoice.count({ where })
        ]);

        res.json({
            data: invoices.map(inv => ({
                ...inv,
                userCount: inv.organization?._count?.users || 0
            })),
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / Number(limit)),
                currentPage: Number(page),
            }
        });
    } catch (error) {
        console.error('Error fetching global invoices:', error);
        res.status(500).json({ error: 'Failed to fetch billing records' });
    }
};

/**
 * PATCH /api/superadmin/billing/invoices/:id/status
 * Update invoice status (e.g., mark as PAID)
 */
export const updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const data = { status };
        if (status === 'PAID') {
            data.paidAt = new Date();
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data
        });

        // If marked as PAID, upgrade the organization
        if (status === 'PAID' && updated.plan) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1); // Default to 1 month

            // For superadmin manual approvals, we don't know the exact billing cycle (annual vs monthly)
            // But we can check if the amount suggests annual.
            // Let's just default to monthly for now, or you could add a cycle check if needed.

            const planLimits = {
                STARTER: { maxUsers: 30, maxProjects: 15 },
                PRO: { maxUsers: 100, maxProjects: 100 },
                ENTERPRISE: { maxUsers: 9999, maxProjects: 9999 }
            };

            const limits = planLimits[updated.plan] || planLimits.STARTER;

            await prisma.organization.update({
                where: { id: updated.organizationId },
                data: {
                    plan: updated.plan,
                    status: 'ACTIVE',
                    maxUsers: limits.maxUsers,
                    maxProjects: limits.maxProjects,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });

            notifyPlanRenewalOrUpgrade({
                orgId: updated.organizationId,
                plan: updated.plan,
                amount: updated.amount,
                invoiceNumber: updated.invoiceNumber,
                paymentId: 'SuperAdmin Manual Approval',
                isAutoRenewal: false,
                io: req.io,
            }).catch(e => console.error('[Billing] Notification failed:', e));
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
};

/**
 * POST /api/superadmin/billing/invoices
 * Manually create an invoice
 */
export const createInvoice = async (req, res) => {
    const { organizationId, amount, description, dueDate, plan, status = 'PENDING' } = req.body;

    try {
        const isPaid = status === 'PAID';
        const now = new Date();
        const date = new Date();
        const invNum = `INV-${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

        const invoice = await prisma.invoice.create({
            data: {
                organizationId,
                amount: Number(amount),
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                plan,
                status: isPaid ? 'PAID' : 'PENDING',
                invoiceNumber: invNum,
                paidAt: isPaid ? now : null,
            },
            include: {
                organization: {
                    select: { name: true }
                }
            }
        });

        // If marked as PAID upon creation, activate plan and set period dates
        if (isPaid && plan) {
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            const planLimits = {
                STARTER: { maxUsers: 30, maxProjects: 15 },
                PRO: { maxUsers: 100, maxProjects: 100 },
                ENTERPRISE: { maxUsers: 9999, maxProjects: 9999 }
            };

            const limits = planLimits[plan] || planLimits.STARTER;

            await prisma.organization.update({
                where: { id: organizationId },
                data: {
                    plan,
                    status: 'ACTIVE',
                    maxUsers: limits.maxUsers,
                    maxProjects: limits.maxProjects,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });

            notifyPlanRenewalOrUpgrade({
                orgId: organizationId,
                plan: plan,
                amount: invoice.amount,
                invoiceNumber: invoice.invoiceNumber,
                paymentId: 'SuperAdmin Provisioned',
                isAutoRenewal: false,
                io: req.io,
            }).catch(e => console.error('[Billing] Notification failed:', e));
        }

        res.status(201).json(invoice);
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
};
