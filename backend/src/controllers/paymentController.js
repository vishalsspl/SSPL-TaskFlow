import Stripe from 'stripe';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

// ─── Stripe Instance ─────────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
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
 * Creates a Stripe Checkout session for plan upgrade.
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

    // Check if already on this plan or higher, UNLESS they are on a trial
    const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
    
    // Allow if they are upgrading to a higher plan, OR if they are paying for their current plan while on TRIAL
    const isUpgrading = planOrder[plan] > planOrder[org.plan];
    const isPayingForCurrentTrial = plan === org.plan && org.status === 'TRIAL';

    if (!isUpgrading && !isPayingForCurrentTrial) {
      return res.status(400).json({ error: `Organization is already on an active ${org.plan} plan or higher` });
    }

    // Calculate amount (Minimum 25 users billed)
    const userCount = await prisma.user.count({
      where: { organizationId: org.id },
    });
    const perUserPrice = await getPlanPrice(plan);
    const billedUsers = Math.max(userCount, 25);
    let totalAmount = perUserPrice * billedUsers;

    // Apply annual discount
    if (billingCycle === 'annually') {
      const discountSetting = await prisma.platformSetting.findUnique({
        where: { key: 'annual_discount_percent' },
      });
      const discountPercent = discountSetting ? Number(discountSetting.value) : 17;
      totalAmount = totalAmount * 12 * (1 - discountPercent / 100);
    }

    // Stripe requires a minimum amount of roughly $0.50 USD (₹40 INR)
    if (totalAmount < 40) {
      return res.status(400).json({ 
        error: `Stripe requires a minimum payment of ₹40. Your current total is ₹${totalAmount}. Please increase the number of users, choose annual billing, or adjust plan pricing in settings.` 
      });
    }

    // Amount in paise (Stripe uses smallest currency unit)
    const amountInPaise = Math.round(totalAmount * 100);

    if (!stripe) {
      return res.status(500).json({ error: 'Payment gateway is not configured on the server.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

    // Create pending invoice first
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        amount: totalAmount,
        currency: 'INR',
        status: 'PENDING',
        plan,
        description: `${plan} Plan - ${billingCycle} billing (${billedUsers} users minimum)`,
        invoiceNumber: generateInvoiceNumber(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `SSPL TaskFlow ${plan} Plan`,
              description: `${billingCycle} billing for ${billedUsers} users`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard?canceled=true`,
      client_reference_id: invoice.id,
      metadata: {
        organizationId: org.id,
        plan,
        billingCycle,
        userId,
        userCount: String(billedUsers),
        invoiceId: invoice.id,
      },
      customer_email: org.billingEmail || user.email,
    });

    // Update invoice with Stripe Session ID
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: session.id },
    });

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// ─── POST /api/billing/verify-payment ───────────────────────────────────────
/**
 * Verifies Stripe session and upgrades the org plan manually (if needed before webhook).
 */
export const verifyPayment = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment gateway is not configured.' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    const invoiceId = session.metadata.invoiceId;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.json({ message: 'Payment already processed', invoice, plan: invoice.plan });
    }

    // Update invoice as paid
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripePaymentIntentId: session.payment_intent,
      },
    });

    // Upgrade the organization plan
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

    if (session.metadata.billingCycle === 'annually') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      periodEnd.setMonth(now.getMonth()); 
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

    // Log activity
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
            paymentId: session.payment_intent,
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
 * Stripe webhook handler. Acts as a backup to verify payments
 * even if the frontend callback fails.
 */
export const handleWebhook = async (req, res) => {
  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];
    
    let event;

    if (endpointSecret) {
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // If no webhook secret, parse from body (not recommended for production)
      event = req.body;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        const invoiceId = session.metadata?.invoiceId;
        const clientRefId = session.client_reference_id; // e.g. "orgId_STARTER"

        // Fetch dynamic platform settings for plan limits
        const allSettings = await prisma.platformSetting.findMany();
        const s = allSettings.reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});

        const getLimitsForPlan = (planName) => {
          if (planName === 'STARTER') {
            return {
              maxUsers: s.starter_max_users ? Number(s.starter_max_users) : 30,
              maxProjects: s.starter_max_projects ? Number(s.starter_max_projects) : 5,
            };
          }
          if (planName === 'PRO' || planName === 'PROFESSIONAL') {
            return {
              maxUsers: s.pro_max_users ? Number(s.pro_max_users) : 100,
              maxProjects: s.pro_max_projects ? Number(s.pro_max_projects) : 50,
            };
          }
          return { maxUsers: 30, maxProjects: 5 }; // fallback
        };

        if (invoiceId) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
          });

          if (invoice && invoice.status !== 'PAID') {
            // Update invoice
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                stripePaymentIntentId: session.payment_intent,
              },
            });

            const limits = getLimitsForPlan(invoice.plan);
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            if (session.metadata?.billingCycle === 'annually') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              periodEnd.setMonth(now.getMonth());
            }

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
        } else if (clientRefId) {
          // ── Handle static Payment Links (Direct Checkout) ──
          const parts = clientRefId.split('_');
          if (parts.length >= 2) {
            const orgId = parts[0];
            let plan = parts[1]; // STARTER or PROFESSIONAL

            // Map PROFESSIONAL to the correct DB enum value PRO
            if (plan === 'PROFESSIONAL') {
              plan = 'PRO';
            }

            const org = await prisma.organization.findUnique({
              where: { id: orgId },
            });

            if (org) {
              const limits = getLimitsForPlan(plan);
              const now = new Date();
              const periodEnd = new Date(now);
              periodEnd.setMonth(periodEnd.getMonth() + 1);

              // ── NEW: Create the Invoice record so it shows up in Billing History ──
              await prisma.invoice.create({
                data: {
                  organizationId: orgId,
                  amount: session.amount_total ? session.amount_total / 100 : 0, // Stripe amount is in cents/paise
                  currency: session.currency ? session.currency.toUpperCase() : 'INR',
                  status: 'PAID',
                  description: `Subscription to ${plan} Plan via Payment Link`,
                  plan: plan,
                  stripeSessionId: session.id,
                  stripePaymentIntentId: session.payment_intent,
                  paidAt: now,
                  invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                },
              });

              await prisma.organization.update({
                where: { id: orgId },
                data: {
                  plan: plan,
                  status: 'ACTIVE',
                  maxUsers: limits.maxUsers,
                  maxProjects: limits.maxProjects,
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                },
              });
            }
          }
        }
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
          description: s.starter_description || 'Essential tools for small teams',
          points: s.starter_points || 'Up to 30 members\n5 projects\nKanban Board\nTasks Management\nTickets & Support\nTeam Management\nChat & Collaboration\nEmail Support',
        },
        PRO: {
          maxUsers: s.pro_max_users ? Number(s.pro_max_users) : 100,
          maxProjects: s.pro_max_projects ? Number(s.pro_max_projects) : 50,
          description: s.pro_description || 'Scale your business with ease',
          points: s.pro_points || 'Up to 100 members\n50 projects\nEverything in Starter\nPerformance Analytics\nTimesheets & Tracking\nGitHub Integration\nActivity Logs & Audit\nPriority Support',
        },
        ENTERPRISE: {
          maxUsers: s.enterprise_max_users ? Number(s.enterprise_max_users) : 1000,
          maxProjects: s.enterprise_max_projects ? Number(s.enterprise_max_projects) : 500,
          description: s.enterprise_description || 'Maximum power and security',
          points: s.enterprise_points || 'Unlimited team members\nUnlimited projects\nEverything in Pro\nSSO & SAML\nCustom Integrations\nDedicated Account Manager\n24/7 Priority Support\nSLA Guarantee',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching current plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan details' });
  }
};
