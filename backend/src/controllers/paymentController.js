import Stripe from 'stripe';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import tenantDbManager from '../lib/tenantDbManager.js';
import { sendPlanRenewedEmailToOrg, sendPlanRenewedNotificationToSuperAdmin } from '../services/emailService.js';

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

    // Allow upgrading, renewing, or downgrading between paid plans
    const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
    const isUpgrading = planOrder[plan] > planOrder[org.plan];
    const isDowngrading = planOrder[plan] < planOrder[org.plan];

    if (isDowngrading) {
      // Downgrading is only allowed when current plan has ended or is ending soon (within 7 days)
      const now = new Date();
      const periodEnd = org.currentPeriodEnd ? new Date(org.currentPeriodEnd) : null;
      const isExpired = org.isExpired || (periodEnd && periodEnd <= now);
      const daysRemaining = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      
      const canDowngrade = isExpired || daysRemaining <= 7;
      if (!canDowngrade) {
        return res.status(400).json({
          error: `Downgrading is only allowed when your current plan has ended or is ending soon (within 7 days). Your current plan has ${daysRemaining} days remaining.`,
        });
      }
    }

    const actionPrefix = isRenewing ? 'Renewal: ' : isDowngrading ? 'Downgrade: ' : '';

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
        description: `${actionPrefix}${plan} Plan - ${billingCycle} billing (${billedUsers} users minimum)`,
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
            recurring: {
              interval: billingCycle === 'annually' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
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

    const orgUpdateData = {
      plan: invoice.plan,
      status: 'ACTIVE',
      autoRenew: true,
      maxUsers: limits.maxUsers,
      maxProjects: limits.maxProjects,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    };
    if (session.subscription) {
      orgUpdateData.stripeSubscriptionId = session.subscription;
    }

    await prisma.organization.update({
      where: { id: invoice.organizationId },
      data: orgUpdateData,
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
            autoRenew: true,
          },
        },
      });
    } catch (logErr) {
      console.error('Failed to log plan upgrade activity:', logErr.message);
    }

    // Trigger email and in-platform notifications to Org and SuperAdmin
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || process.env.FRONTEND_URL;
    notifyPlanRenewalOrUpgrade({
      orgId: invoice.organizationId,
      plan: invoice.plan,
      amount: invoice.amount,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: session.payment_intent,
      isAutoRenewal: false,
      origin,
      io: req.io,
    }).catch(err => console.error('[verifyPayment] Notification trigger failed:', err));

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


/**
 * Helper: Send email and in-platform notifications to both Organization Admins and SuperAdmins
 * when a plan is renewed or upgraded.
 */
export const notifyPlanRenewalOrUpgrade = async ({
  orgId,
  plan,
  amount,
  invoiceNumber,
  paymentId,
  isAutoRenewal = false,
  origin = null,
  io = null,
}) => {
  try {
    // 1. Fetch Organization with its Admins
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!org) return;

    const frontendUrl = origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const nextBillingDate = org.currentPeriodEnd
      ? new Date(org.currentPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Next Month';
    const periodStartDate = org.currentPeriodStart
      ? new Date(org.currentPeriodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Current Period';

    const renewalDetails = {
      orgName: org.name,
      adminEmail: org.billingEmail || org.users?.[0]?.email || 'N/A',
      plan,
      amount: Number(amount),
      invoiceNumber: invoiceNumber || 'INV-PROCESSED',
      paymentId: paymentId || 'Stripe Payment',
      periodStart: periodStartDate,
      periodEnd: nextBillingDate,
      nextBillingDate,
      isAutoRenew: org.autoRenew !== false,
      isAutoRenewal,
    };

    // 2. Fetch all SuperAdmins
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      select: { id: true, name: true, email: true },
    });

    // ── A. NOTIFY ORGANIZATION ADMINS ─────────────────────────────────────────
    const orgAdmin = org.users?.[0];
    const orgAdminEmail = org.billingEmail || orgAdmin?.email;
    const orgAdminName = org.primaryContactName || orgAdmin?.name || 'Administrator';

    // 1) Email to Org Admin
    if (orgAdminEmail) {
      await sendPlanRenewedEmailToOrg(orgAdminEmail, orgAdminName, org.name, renewalDetails, frontendUrl).catch((err) => {
        console.error('[Notification] Failed to send renewal email to org admin:', err.message);
      });
    }

    // 2) In-Platform Notification to Org Admins (Main DB + Tenant DB)
    const orgNotifTitle = isAutoRenewal ? 'Subscription Automatically Renewed' : 'Plan Renewed Successfully';
    const orgNotifMsg = `Your ${plan} plan has been renewed for ₹${Number(amount).toLocaleString('en-IN')}. Next renewal: ${nextBillingDate}.`;

    for (const admin of org.users) {
      // Main DB Notification
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: orgNotifTitle,
          message: orgNotifMsg,
          type: 'PLAN_RENEWED',
          link: '/billing',
        },
      }).catch((e) => console.warn('[Notification] Main DB notif error:', e.message));

      // Tenant DB Notification (if dedicated DB exists)
      if (org.dbUrl) {
        try {
          const tenantDb = await tenantDbManager.getClient(org.dbUrl);
          await tenantDb.notification.create({
            data: {
              userId: admin.id,
              organizationId: org.id,
              title: orgNotifTitle,
              message: orgNotifMsg,
              type: 'PLAN_RENEWED',
              link: '/billing',
            },
          });
        } catch (tErr) {
          console.warn('[Notification] Tenant DB notif error:', tErr.message);
        }
      }
    }

    // Socket emit to Org room
    if (io) {
      io.to(`org-${org.id}`).emit('new-notification', {
        title: orgNotifTitle,
        message: orgNotifMsg,
        type: 'PLAN_RENEWED',
        link: '/billing',
        createdAt: new Date(),
      });
    }

    // ── B. NOTIFY SUPERADMINS ─────────────────────────────────────────────────
    const superNotifTitle = `Organization Plan Renewed: ${org.name}`;
    const superNotifMsg = `${org.name} has successfully renewed their ${plan} plan for ₹${Number(amount).toLocaleString('en-IN')} (Invoice: ${renewalDetails.invoiceNumber}).`;

    for (const sa of superAdmins) {
      // 1) Email to SuperAdmin
      if (sa.email) {
        await sendPlanRenewedNotificationToSuperAdmin(sa.email, sa.name, renewalDetails, frontendUrl).catch((err) => {
          console.error(`[Notification] Failed to send renewal email to superadmin ${sa.email}:`, err.message);
        });
      }

      // 2) In-Platform Notification to SuperAdmin (Main DB)
      await prisma.notification.create({
        data: {
          userId: sa.id,
          title: superNotifTitle,
          message: superNotifMsg,
          type: 'ORG_PLAN_RENEWED',
          link: '/superadmin/billing',
        },
      }).catch((e) => console.warn('[Notification] SuperAdmin DB notif error:', e.message));
    }

    console.log(`[Notification] 🔔 Successfully sent renewal emails and in-platform notifications for ${org.name} (${plan})`);
  } catch (err) {
    console.error('[Notification] Error in notifyPlanRenewalOrUpgrade:', err);
  }
};

/**
 * Helper: Notify Organization Admins and SuperAdmins when automatic recurring payment fails
 */
export const notifyPaymentFailed = async ({ orgId, plan, amount, invoiceNumber }) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!org) return;

    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      select: { id: true, name: true, email: true },
    });

    const orgNotifTitle = 'Subscription Renewal Payment Failed';
    const orgNotifMsg = `Automatic renewal payment of ₹${Number(amount).toLocaleString('en-IN')} for your ${plan} plan could not be processed. Please resolve the pending invoice.`;

    // Notify Org Admins
    for (const admin of org.users) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: orgNotifTitle,
          message: orgNotifMsg,
          type: 'PAYMENT_FAILED',
          link: '/billing',
        },
      }).catch(() => {});

      if (org.dbUrl) {
        try {
          const tenantDb = await tenantDbManager.getClient(org.dbUrl);
          await tenantDb.notification.create({
            data: {
              userId: admin.id,
              organizationId: org.id,
              title: orgNotifTitle,
              message: orgNotifMsg,
              type: 'PAYMENT_FAILED',
              link: '/billing',
            },
          });
        } catch (e) {}
      }
    }

    // Notify SuperAdmins
    const superNotifTitle = `Payment Failed: ${org.name}`;
    const superNotifMsg = `${org.name} automatic renewal payment of ₹${Number(amount).toLocaleString('en-IN')} failed (Invoice: ${invoiceNumber}).`;

    for (const sa of superAdmins) {
      await prisma.notification.create({
        data: {
          userId: sa.id,
          title: superNotifTitle,
          message: superNotifMsg,
          type: 'ORG_PAYMENT_FAILED',
          link: '/superadmin/billing',
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[Notification] Error in notifyPaymentFailed:', err);
  }
};

// ─── PATCH /api/billing/auto-renew ──────────────────────────────────────────
/**
 * Toggles auto-renewal for the authenticated user's organization.
 */
export const toggleAutoRenew = async (req, res) => {
  try {
    const { autoRenew } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'No organization found for user' });
    }

    const newAutoRenew = Boolean(autoRenew);

    const updatedOrg = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { autoRenew: newAutoRenew },
    });

    // If Stripe subscription ID is present, update cancel_at_period_end on Stripe
    if (updatedOrg.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.update(updatedOrg.stripeSubscriptionId, {
          cancel_at_period_end: !newAutoRenew,
        });
      } catch (stripeErr) {
        console.warn('[Stripe] Could not update subscription cancel_at_period_end:', stripeErr.message);
      }
    }

    // Activity log
    try {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          organizationId: user.organizationId,
          action: 'AUTO_RENEW_TOGGLED',
          entity: 'organization',
          entityId: user.organizationId,
          details: { autoRenew: newAutoRenew },
        },
      });
    } catch (logErr) {
      console.warn('Failed to log auto-renew activity:', logErr.message);
    }

    res.json({
      success: true,
      autoRenew: updatedOrg.autoRenew,
      message: newAutoRenew
        ? 'Automatic renewal enabled. Payment will be deducted automatically on your renewal date.'
        : 'Automatic renewal disabled. Please renew manually before your plan expires.',
    });
  } catch (error) {
    console.error('Error toggling auto-renew:', error);
    res.status(500).json({ error: 'Failed to update auto-renewal setting' });
  }
};

// ─── POST /api/billing/webhook ──────────────────────────────────────────────
/**
 * Stripe webhook handler. Acts as a backup to verify payments
 * even if the frontend callback fails, and handles recurring subscription renewals.
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

    // Helper to get plan limits
    const getLimitsForPlan = async (planName) => {
      const allSettings = await prisma.platformSetting.findMany();
      const s = allSettings.reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});
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
      return { maxUsers: 30, maxProjects: 5 };
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        const invoiceId = session.metadata?.invoiceId;
        const clientRefId = session.client_reference_id; // e.g. "orgId_STARTER"

        if (invoiceId) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
          });

          if (invoice && invoice.status !== 'PAID') {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                stripePaymentIntentId: session.payment_intent,
              },
            });

            const limits = await getLimitsForPlan(invoice.plan);
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            if (session.metadata?.billingCycle === 'annually') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              periodEnd.setMonth(now.getMonth());
            }

            const orgData = {
              plan: invoice.plan,
              status: 'ACTIVE',
              autoRenew: true,
              maxUsers: limits.maxUsers,
              maxProjects: limits.maxProjects,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            };
            if (session.subscription) {
              orgData.stripeSubscriptionId = session.subscription;
            }

            await prisma.organization.update({
              where: { id: invoice.organizationId },
              data: orgData,
            });

            // Trigger email and in-platform notifications to Org and SuperAdmin
            notifyPlanRenewalOrUpgrade({
              orgId: invoice.organizationId,
              plan: invoice.plan,
              amount: invoice.amount,
              invoiceNumber: invoice.invoiceNumber,
              paymentId: session.payment_intent,
              isAutoRenewal: false,
              io: req.io,
            }).catch(err => console.error('[Webhook] Notification trigger failed:', err));
          }
        } else if (clientRefId) {
          // ── Handle static Payment Links (Direct Checkout) ──
          const parts = clientRefId.split('_');
          if (parts.length >= 2) {
            const orgId = parts[0];
            let plan = parts[1];

            if (plan === 'PROFESSIONAL') {
              plan = 'PRO';
            }

            const org = await prisma.organization.findUnique({
              where: { id: orgId },
            });

            if (org) {
              const limits = await getLimitsForPlan(plan);
              const now = new Date();
              const periodEnd = new Date(now);
              periodEnd.setMonth(periodEnd.getMonth() + 1);

              const newInvoice = await prisma.invoice.create({
                data: {
                  organizationId: orgId,
                  amount: session.amount_total ? session.amount_total / 100 : 0,
                  currency: session.currency ? session.currency.toUpperCase() : 'INR',
                  status: 'PAID',
                  description: `Subscription to ${plan} Plan via Payment Link`,
                  plan: plan,
                  stripeSessionId: session.id,
                  stripePaymentIntentId: session.payment_intent,
                  paidAt: now,
                  invoiceNumber: generateInvoiceNumber(),
                },
              });

              const orgData = {
                plan: plan,
                status: 'ACTIVE',
                autoRenew: true,
                maxUsers: limits.maxUsers,
                maxProjects: limits.maxProjects,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
              };
              if (session.subscription) {
                orgData.stripeSubscriptionId = session.subscription;
              }

              await prisma.organization.update({
                where: { id: orgId },
                data: orgData,
              });

              // Trigger email and in-platform notifications to Org and SuperAdmin
              notifyPlanRenewalOrUpgrade({
                orgId,
                plan,
                amount: newInvoice.amount,
                invoiceNumber: newInvoice.invoiceNumber,
                paymentId: session.payment_intent,
                isAutoRenewal: false,
                io: req.io,
              }).catch(err => console.error('[Webhook] Notification trigger failed:', err));
            }
          }
        }
      }
    }

    // ── Recurring Subscription Renewal: Payment Succeeded ──────────────────
    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
      const stripeInvoice = event.data.object;
      const subscriptionId = stripeInvoice.subscription;

      if (subscriptionId) {
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (org) {
          // If autoRenew is OFF, cancel subscription in Stripe and do not extend plan
          if (org.autoRenew === false) {
            console.log(`[Webhook] Org ${org.name} has autoRenew disabled. Skipping automatic renewal extension.`);
            if (stripe) {
              await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true }).catch(() => {});
            }
          } else {
            // Avoid duplicate invoice if already logged for this payment intent
            const existing = stripeInvoice.payment_intent ? await prisma.invoice.findFirst({
              where: {
                organizationId: org.id,
                stripePaymentIntentId: stripeInvoice.payment_intent,
              },
            }) : null;

            if (!existing) {
              const userCount = await prisma.user.count({ where: { organizationId: org.id } });
              const billedUsers = Math.max(userCount, 25);
              const amount = stripeInvoice.amount_paid ? stripeInvoice.amount_paid / 100 : Number(stripeInvoice.amount_due) / 100;
              const periodStart = new Date(stripeInvoice.period_start ? stripeInvoice.period_start * 1000 : Date.now());
              const periodEnd = new Date(stripeInvoice.period_end ? stripeInvoice.period_end * 1000 : (Date.now() + 30 * 24 * 60 * 60 * 1000));

              const newInvoice = await prisma.invoice.create({
                data: {
                  organizationId: org.id,
                  amount: amount > 0 ? amount : 375,
                  currency: (stripeInvoice.currency || 'INR').toUpperCase(),
                  status: 'PAID',
                  plan: org.plan,
                  description: `Automatic Renewal: ${org.plan} Plan (${billedUsers} users minimum)`,
                  invoiceNumber: generateInvoiceNumber(),
                  stripePaymentIntentId: stripeInvoice.payment_intent,
                  paidAt: periodStart,
                  dueDate: periodStart,
                  createdAt: periodStart,
                },
              });

              await prisma.organization.update({
                where: { id: org.id },
                data: {
                  status: 'ACTIVE',
                  currentPeriodStart: periodStart,
                  currentPeriodEnd: periodEnd,
                },
              });

              console.log(`[Webhook] Successfully auto-renewed subscription for org: ${org.name}`);

              // Trigger email and in-platform notifications to Org and SuperAdmin
              notifyPlanRenewalOrUpgrade({
                orgId: org.id,
                plan: org.plan,
                amount: newInvoice.amount,
                invoiceNumber: newInvoice.invoiceNumber,
                paymentId: stripeInvoice.payment_intent,
                isAutoRenewal: true,
                io: req.io,
              }).catch(err => console.error('[Webhook] Recurring notification trigger failed:', err));
            }
          }
        }
      }
    }

    // ── Recurring Subscription Renewal: Payment Failed ─────────────────────
    if (event.type === 'invoice.payment_failed') {
      const stripeInvoice = event.data.object;
      const subscriptionId = stripeInvoice.subscription;

      if (subscriptionId) {
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (org) {
          const userCount = await prisma.user.count({ where: { organizationId: org.id } });
          const billedUsers = Math.max(userCount, 25);
          const amount = stripeInvoice.amount_due ? stripeInvoice.amount_due / 100 : 375;

          const pendingInvoice = await prisma.invoice.create({
            data: {
              organizationId: org.id,
              amount,
              currency: (stripeInvoice.currency || 'INR').toUpperCase(),
              status: 'PENDING',
              plan: org.plan,
              description: `Renewal Payment Failed: ${org.plan} Plan - Card deduction failed`,
              invoiceNumber: generateInvoiceNumber(),
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days grace
            },
          });

          console.warn(`[Webhook] Recurring payment failed for org: ${org.name}. Created PENDING invoice.`);

          // Trigger failure notifications
          notifyPaymentFailed({
            orgId: org.id,
            plan: org.plan,
            amount: pendingInvoice.amount,
            invoiceNumber: pendingInvoice.invoiceNumber,
          }).catch(err => console.error('[Webhook] Failure notification failed:', err));
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
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    let invoices = await prisma.invoice.findMany({
      where: { 
        organizationId: user.organizationId,
        NOT: {
          status: 'PENDING',
          stripeSessionId: { not: null }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { name: true, billingEmail: true },
        },
      },
    });

    // Auto-heal: If organization is on a paid plan (STARTER, PRO, ENTERPRISE) but has no invoices in DB
    // (e.g. provisioned or updated directly by SuperAdmin), automatically generate their subscription invoice.
    if (invoices.length === 0 && user.organization && user.organization.plan && user.organization.plan !== 'FREE') {
      const org = user.organization;
      const userCount = await prisma.user.count({ where: { organizationId: org.id } });
      const billedUsers = Math.max(userCount, 25);
      const perUserPrice = await getPlanPrice(org.plan);
      const amount = perUserPrice * billedUsers;

      const now = new Date();
      const periodStart = org.currentPeriodStart || org.createdAt || now;
      let periodEnd = org.currentPeriodEnd;
      if (!periodEnd) {
        const next = new Date(periodStart);
        next.setMonth(next.getMonth() + 1);
        periodEnd = next > now ? next : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const newInvoice = await prisma.invoice.create({
        data: {
          organizationId: org.id,
          amount,
          currency: 'INR',
          status: 'PAID',
          plan: org.plan,
          description: `${org.plan} Plan - monthly billing (${billedUsers} users minimum)`,
          invoiceNumber: generateInvoiceNumber(),
          paidAt: periodStart,
          dueDate: periodStart,
          createdAt: periodStart,
        },
        include: {
          organization: {
            select: { name: true, billingEmail: true },
          },
        },
      });

      if (!org.currentPeriodStart || !org.currentPeriodEnd) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      invoices = [newInvoice];
    }

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
    let periodStart = org.currentPeriodStart;
    let periodEnd = org.currentPeriodEnd;

    // If on a paid plan but period end is missing, compute and save it
    if (org.plan !== 'FREE' && (!periodStart || !periodEnd)) {
      const latestInvoice = await prisma.invoice.findFirst({
        where: { organizationId: org.id, status: 'PAID' },
        orderBy: { createdAt: 'desc' }
      });
      periodStart = periodStart || latestInvoice?.paidAt || latestInvoice?.createdAt || org.createdAt || new Date();
      const nextMonth = new Date(periodStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      periodEnd = nextMonth > new Date() ? nextMonth : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

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
      autoRenew: org.autoRenew !== false,
      maxUsers: org.maxUsers,
      maxProjects: org.maxProjects,
      currentUsers: userCount,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
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
