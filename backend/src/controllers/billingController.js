import prisma from '../lib/prisma.js';

/**
 * GET /api/superadmin/billing/invoices
 * Fetch all invoices with organization details
 */
export const getGlobalInvoices = async (req, res) => {
    const { status, organizationId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
        const where = {
            ...(status && { status }),
            ...(organizationId && { organizationId }),
        };

        const [invoices, totalCount] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    organization: {
                        include: {
                            _count: {
                                select: { users: true }
                            }
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { invoiceDate: 'desc' }
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
    const { organizationId, amount, description, dueDate, plan } = req.body;

    try {
        const invoice = await prisma.invoice.create({
            data: {
                organizationId,
                amount: Number(amount),
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                plan,
                status: 'PENDING'
            },
            include: {
                organization: {
                    select: { name: true }
                }
            }
        });

        res.status(201).json(invoice);
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
};
