import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

// ─── Razorpay Instance ─────────────────────────────────────────────────────
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ─── Plan Pricing (fallback, overridden by PlatformSettings) ────────────
const DEFAULT_PRICES = {
  STARTER: 10,   // ₹10/user/month
  PRO: 10,       // ₹10/user/month
};

/**
 * Helper: Fetch per-user price from PlatformSettings
 */
const getPlanPrice = async (plan) => {
  const key = plan === 'PRO' ? 'pro_per_user_price' : 'starter_per_user_price';
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  return setting ? Number(setting.value) : DEFAULT_PRICES[plan] || 0;
};

/**
 * Helper: Generate unique invoice number
 */
const generateInvoiceNumber = () => {
  const date = new Date();
  const prefix = 'INV';
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}-${random}`;
};

// ─── POST /api/billing/create-order ─────────────────────────────────────────
/**
 * Creates a Razorpay order for plan upgrade.
 * Called by ADMIN when they want to upgrade their org's plan.
 */
export const createOrder = async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;
    const userId = req.user.id;

    // Validate plan
    if (!['STARTER', 'PRO'].includes(plan)) {
      return res.status(400).json({
        error: 'Invalid plan. Choose STARTER or PRO. For ENTERPRISE, contact sales.',
      });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'No organization found for user' });
    }

    const org = user.organization;

    // Check if already on this plan or higher
    const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
    if (planOrder[org.plan] >= planOrder[plan]) {
      return res.status(400).json({ error: `Organization is already on ${org.plan} plan or higher` });
    }

    // Calculate amount
    const userCount = await prisma.user.count({
      where: { organizationId: org.id },
    });
    const perUserPrice = await getPlanPrice(plan);
    let totalAmount = perUserPrice * Math.max(userCount, 1);

    // Apply annual discount
    if (billingCycle === 'annually') {
      const discountSetting = await prisma.platformSetting.findUnique({
        where: { key: 'annual_discount_percent' },
      });
      const discountPercent = discountSetting ? Number(discountSetting.value) : 17;
      totalAmount = totalAmount * 12 * (1 - discountPercent / 100);
    }

    // Amount in paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(totalAmount * 100);

    if (!razorpay) {
      return res.status(500).json({ error: 'Payment gateway is not configured on the server.' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${org.id}_${Date.now()}`,
      notes: {
        organizationId: org.id,
        plan,
        billingCycle,
        userId,
        userCount: String(userCount),
      },
    });

    // Create pending invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        amount: totalAmount,
        currency: 'INR',
        status: 'PENDING',
        plan,
        description: `${plan} Plan - ${billingCycle} billing (${userCount} users)`,
        razorpayOrderId: order.id,
        invoiceNumber: generateInvoiceNumber(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      invoiceId: invoice.id,
      key: process.env.RAZORPAY_KEY_ID,
      organization: {
        name: org.name,
        email: org.billingEmail || user.email,
      },
      plan,
      billingCycle,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// ─── POST /api/billing/verify-payment ───────────────────────────────────────
/**
 * Verifies Razorpay payment signature and upgrades the org plan.
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoiceId,
    } = req.body;

    // 1. Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // 2. Find and update invoice
    const invoice = await prisma.invoice.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found for this order' });
    }

    if (invoice.status === 'PAID') {
      return res.json({ message: 'Payment already processed', invoice });
    }

    // 3. Update invoice as paid
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // 4. Upgrade the organization plan
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

    // Check notes for billing cycle
    try {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      if (order.notes?.billingCycle === 'annually') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setMonth(now.getMonth()); // Reset month offset
      }
    } catch (e) {
      // Fallback to monthly if fetch fails
    }

    // Determine new plan limits
    const planLimits = {
      STARTER: { maxUsers: 30, maxProjects: 15 },
      PRO: { maxUsers: 100, maxProjects: 100 },
    };

    const limits = planLimits[invoice.plan] || planLimits.STARTER;

    await prisma.organization.update({
      where: { id: invoice.organizationId },
      data: {
        plan: invoice.plan,
        status: 'ACTIVE',
        maxUsers: limits.maxUsers,
        maxProjects: limits.maxProjects,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // 5. Log activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          organizationId: invoice.organizationId,
          action: 'PLAN_UPGRADED',
          entity: 'organization',
          entityId: invoice.organizationId,
          details: {
            plan: invoice.plan,
            amount: Number(invoice.amount),
            paymentId: razorpay_payment_id,
          },
        },
      });
    } catch (logErr) {
      console.error('Failed to log plan upgrade activity:', logErr.message);
    }

    res.json({
      message: 'Payment verified and plan upgraded successfully',
      invoice: updatedInvoice,
      plan: invoice.plan,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// ─── POST /api/billing/webhook ──────────────────────────────────────────────
/**
 * Razorpay webhook handler. Acts as a backup to verify payments
 * even if the frontend callback fails.
 */
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      // Find invoice by order ID
      const invoice = await prisma.invoice.findFirst({
        where: { razorpayOrderId: orderId },
      });

      if (invoice && invoice.status !== 'PAID') {
        // Update invoice
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            razorpayPaymentId: payment.id,
          },
        });

        // Upgrade organization plan
        const planLimits = {
          STARTER: { maxUsers: 30, maxProjects: 15 },
          PRO: { maxUsers: 100, maxProjects: 100 },
        };

        const limits = planLimits[invoice.plan] || planLimits.STARTER;
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.organization.update({
          where: { id: invoice.organizationId },
          data: {
            plan: invoice.plan,
            status: 'ACTIVE',
            maxUsers: limits.maxUsers,
            maxProjects: limits.maxProjects,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ─── GET /api/billing/history ───────────────────────────────────────────────
/**
 * Returns payment/invoice history for the authenticated user's organization.
 */
export const getBillingHistory = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { name: true, billingEmail: true },
        },
      },
    });

    res.json({ data: invoices });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
};

// ─── GET /api/billing/current-plan ──────────────────────────────────────────
/**
 * Returns current plan details and usage stats for the org.
 */
export const getCurrentPlan = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    const org = user.organization;

    // Get usage stats
    const [userCount, projectCount] = await Promise.all([
      prisma.user.count({ where: { organizationId: org.id } }),
      // Projects are in tenant DB — we'll count from main DB users for now
      // For a more accurate count, the frontend can call the tenant API separately
      0,
    ]);

    // Get pricing info + tier limits
    const allSettings = await prisma.platformSetting.findMany();
    const s = allSettings.reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});

    res.json({
      plan: org.plan,
      status: org.status,
      maxUsers: org.maxUsers,
      maxProjects: org.maxProjects,
      currentUsers: userCount,
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.currentPeriodEnd,
      pricing: {
        starter: s.starter_per_user_price ? Number(s.starter_per_user_price) : DEFAULT_PRICES.STARTER,
        pro: s.pro_per_user_price ? Number(s.pro_per_user_price) : DEFAULT_PRICES.PRO,
        annualDiscount: s.annual_discount_percent ? Number(s.annual_discount_percent) : 17,
      },
      tiers: {
        STARTER: {
          maxUsers: s.starter_max_users ? Number(s.starter_max_users) : 30,
          maxProjects: s.starter_max_projects ? Number(s.starter_max_projects) : 5,
        },
        PRO: {
          maxUsers: s.pro_max_users ? Number(s.pro_max_users) : 100,
          maxProjects: s.pro_max_projects ? Number(s.pro_max_projects) : 50,
        },
        ENTERPRISE: {
          maxUsers: s.enterprise_max_users ? Number(s.enterprise_max_users) : 1000,
          maxProjects: s.enterprise_max_projects ? Number(s.enterprise_max_projects) : 500,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching current plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan details' });
  }
};
