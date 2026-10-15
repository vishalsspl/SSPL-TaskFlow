import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useHeaderStore } from '@/store/headerStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Crown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ArrowUpRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Users,
  FolderKanban,
  CalendarDays,
  Loader2,
  Check,
  Rocket,
  ArrowRight,
  ArrowDownRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import html2pdf from 'html2pdf.js';

const BillingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setHeader } = useHeaderStore();
  const { user, syncUser } = useAuthStore();
  const { toast } = useToast();
  const [planData, setPlanData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null); // 'STARTER' | 'PRO' | null
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  useEffect(() => {
    setHeader('Billing & Plans', 'Manage your subscription and payment history');
    
    // Check for Stripe redirect params
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success && sessionId) {
      verifyStripePayment(sessionId);
    } else if (canceled) {
      toast({
        title: 'Payment Cancelled',
        description: 'You can upgrade your plan anytime.',
      });
      // Clear URL params
      setSearchParams(new URLSearchParams());
      fetchData();
    } else {
      fetchData();
    }
  }, [setHeader, searchParams]);

  const verifyStripePayment = async (sessionId) => {
    try {
      setLoading(true);
      const res = await api.post('/billing/verify-payment', { session_id: sessionId });
      toast({
        title: '🎉 Payment Successful!',
        description: `Your organization has been upgraded to the ${res.data.plan} plan.`,
      });
      // Clear URL params
      setSearchParams(new URLSearchParams());
      await fetchData();
      await syncUser(api);
    } catch (error) {
      console.error('Failed to verify payment:', error);
      toast({
        title: 'Verification Failed',
        description: 'Payment verification is pending or failed. Please contact support if the issue persists.',
        variant: 'destructive',
      });
      setSearchParams(new URLSearchParams());
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [planRes, historyRes] = await Promise.all([
        api.get('/billing/current-plan'),
        api.get('/billing/history'),
      ]);
      setPlanData(planRes.data);
      setInvoices(historyRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast({
        title: 'Error',
        description: 'Could not load billing information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenew = async (checked) => {
    try {
      setUpdatingAutoRenew(true);
      const res = await api.patch('/billing/auto-renew', { autoRenew: checked });
      setPlanData((prev) => ({ ...prev, autoRenew: res.data.autoRenew }));
      await syncUser(api);
      toast({
        title: res.data.autoRenew ? 'Auto-Renewal Enabled' : 'Auto-Renewal Disabled',
        description: res.data.message,
      });
    } catch (error) {
      console.error('Failed to toggle auto-renew:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Could not update auto-renewal setting',
        variant: 'destructive',
      });
    } finally {
      setUpdatingAutoRenew(false);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      setDownloadingInvoiceId(invoice.id);
      const invNum = invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
      const orgName = invoice.organization?.name || user?.organization?.name || 'Customer Organization';
      const orgEmail = invoice.organization?.billingEmail || user?.email || 'N/A';
      const issueDate = format(new Date(invoice.createdAt || invoice.paidAt || Date.now()), 'dd MMMM yyyy');
      const paidDate = invoice.paidAt ? format(new Date(invoice.paidAt), 'dd MMMM yyyy, hh:mm a') : 'Pending';
      const isPaid = invoice.status === 'PAID';
      const amountFormatted = `₹${Number(invoice.amount).toLocaleString('en-IN')}`;
      const planName = invoice.plan || 'TaskFlow Subscription';

      let statusBadgeHtml = '';
      if (invoice.status === 'PAID') {
        statusBadgeHtml = `
          <div style="display: inline-block; background-color: #ecfdf5; border: 2px solid #059669; border-radius: 7px; padding: 5px 14px; text-align: left;">
            <table style="border-collapse: collapse; border: none; margin: 0; padding: 0;">
              <tr>
                <td style="vertical-align: middle; border: none; padding: 0 7px 0 0; line-height: 0;">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                    <circle cx="8" cy="8" r="8" fill="#059669"/>
                    <path d="M4.8 8.2L7 10.4L11.5 5.6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </td>
                <td style="vertical-align: middle; border: none; padding: 0; line-height: 1;">
                  <span style="font-size: 13px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; font-family: 'Inter', sans-serif;">PAID</span>
                </td>
              </tr>
            </table>
          </div>
        `;
      } else if (invoice.status === 'PENDING') {
        statusBadgeHtml = `
          <div style="display: inline-block; background-color: #fffbeb; border: 2px solid #d97706; border-radius: 7px; padding: 5px 12px; text-align: left;">
            <table style="border-collapse: collapse; border: none; margin: 0; padding: 0;">
              <tr>
                <td style="vertical-align: middle; border: none; padding: 0 6px 0 0; line-height: 0;">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                    <circle cx="8" cy="8" r="8" fill="#d97706"/>
                    <path d="M8 4.5V8.5L10.5 10" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </td>
                <td style="vertical-align: middle; border: none; padding: 0; line-height: 1;">
                  <span style="font-size: 11px; font-weight: 800; color: #92400e; letter-spacing: 0.8px; font-family: 'Inter', sans-serif;">PENDING PAYMENT</span>
                </td>
              </tr>
            </table>
          </div>
        `;
      } else {
        statusBadgeHtml = `
          <div style="display: inline-block; background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 7px; padding: 5px 12px; text-align: left;">
            <table style="border-collapse: collapse; border: none; margin: 0; padding: 0;">
              <tr>
                <td style="vertical-align: middle; border: none; padding: 0 6px 0 0; line-height: 0;">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                    <circle cx="8" cy="8" r="8" fill="#dc2626"/>
                    <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </td>
                <td style="vertical-align: middle; border: none; padding: 0; line-height: 1;">
                  <span style="font-size: 11px; font-weight: 800; color: #991b1b; letter-spacing: 0.8px; font-family: 'Inter', sans-serif;">${invoice.status || 'UNPAID'}</span>
                </td>
              </tr>
            </table>
          </div>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invNum}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; }
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #ffffff; margin: 0; padding: 28px; }
            .invoice-box { max-width: 800px; margin: auto; }
            
            .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
            .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 5px; }
            .meta-value-main { font-size: 15px; font-weight: 700; color: #0f172a; }
            .meta-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
            
            .items-table { width: 100%; border-collapse: collapse; margin: 24px 0 16px 0; }
            .items-table thead th { background: #0f172a; color: #ffffff; text-align: left; padding: 11px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .items-table thead th:last-child { text-align: right; }
            .items-table tbody td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            .items-table tbody td:last-child { text-align: right; font-weight: 700; color: #0f172a; }
            
            .notice-box { margin-top: 28px; padding: 14px 18px; border-radius: 8px; font-size: 11.5px; line-height: 1.5; background: #f8fafc; border-left: 4px solid #4f46e5; color: #334155; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- HEADER (Robust table layout avoids html2canvas flexbox baseline bugs) -->
            <table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 24px 0; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
              <tr>
                <td style="vertical-align: top; text-align: left; padding: 0 0 16px 0; border: none;">
                  <table style="border-collapse: collapse; border: none; margin: 0; padding: 0;">
                    <tr>
                      <td style="vertical-align: middle; padding: 0 12px 0 0; border: none; width: 44px;">
                        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                          <defs>
                            <linearGradient id="tfGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                              <stop stop-color="#4F46E5"/>
                              <stop offset="1" stop-color="#7C3AED"/>
                            </linearGradient>
                          </defs>
                          <rect width="44" height="44" rx="10" fill="url(#tfGrad)"/>
                          <path d="M13 22.5L19 28.5L31 15.5" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </td>
                      <td style="vertical-align: middle; padding: 0; border: none;">
                        <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1; font-family: 'Inter', sans-serif;">TaskFlow</div>
                        <div style="font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px; font-family: 'Inter', sans-serif;">SaaS Enterprise Platform</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align: top; text-align: right; padding: 0 0 16px 0; border: none;">
                  <div style="font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.1; font-family: 'Inter', sans-serif;">TAX INVOICE</div>
                  <div style="font-size: 13px; font-family: monospace; font-weight: 700; color: #4f46e5; margin-top: 4px;">${invNum}</div>
                  <div style="margin-top: 8px;">
                    ${statusBadgeHtml}
                  </div>
                </td>
              </tr>
            </table>

            <!-- METADATA (Two-column table prevents flex/grid overlap) -->
            <table style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 20px 0;">
              <tr>
                <td style="width: 48.5%; vertical-align: top; padding: 0; border: none;">
                  <div class="meta-card">
                    <div class="meta-label">Billed To</div>
                    <div class="meta-value-main">${orgName}</div>
                    <div class="meta-sub">${orgEmail}</div>
                    <div class="meta-sub" style="font-size: 11px; margin-top: 4px; color: #059669; font-weight: 600;">● Account Active</div>
                  </div>
                </td>
                <td style="width: 3%; border: none;"></td>
                <td style="width: 48.5%; vertical-align: top; padding: 0; border: none;">
                  <div class="meta-card">
                    <div class="meta-label">Invoice Details</div>
                    <div class="meta-sub"><strong style="color: #334155;">Date of Issue:</strong> ${issueDate}</div>
                    <div class="meta-sub"><strong style="color: #334155;">Payment Status:</strong> ${invoice.status}</div>
                    <div class="meta-sub"><strong style="color: #334155;">Payment Date:</strong> ${paidDate}</div>
                    ${invoice.stripePaymentIntentId ? `<div class="meta-sub" style="font-family: monospace; font-size: 10px; margin-top: 2px;">Ref: ${invoice.stripePaymentIntentId}</div>` : ''}
                  </div>
                </td>
              </tr>
            </table>

            <!-- LINE ITEMS -->
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Plan Tier</th>
                  <th style="text-align: center;">Billing Cycle</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${invoice.description || `${planName} Subscription`}</div>
                    <div style="font-size: 11px; color: #64748b;">Enterprise Workspace & Team Access</div>
                  </td>
                  <td style="text-align: center; font-weight: 600;">${planName}</td>
                  <td style="text-align: center; color: #64748b;">Monthly / Recurring</td>
                  <td>${amountFormatted}</td>
                </tr>
              </tbody>
            </table>

            <!-- SUMMARY TABLE -->
            <table style="width: 280px; margin-left: auto; margin-top: 14px; border-collapse: collapse; border: none;">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; border: none;">Subtotal</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; border: none;">${amountFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; border: none;">Taxes & GST (0%)</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; border: none;">₹0.00</td>
              </tr>
              <tr>
                <td style="padding: 10px 0 6px 0; font-size: 15px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: none; border-left: none; border-right: none;">Total Amount</td>
                <td style="padding: 10px 0 6px 0; font-size: 17px; font-weight: 800; color: #4f46e5; text-align: right; border-top: 2px solid #0f172a; border-bottom: none; border-left: none; border-right: none;">${amountFormatted}</td>
              </tr>
            </table>

            <div class="notice-box">
              <strong>Billing Policy & Renewal Disclosure:</strong><br />
              ${planData?.autoRenew !== false
                ? `Automatic recurring billing is <strong>ACTIVE</strong> for ${orgName}. Your payment method on file will be automatically billed on your next renewal date.`
                : `Automatic recurring billing is <strong>DISABLED</strong> for ${orgName}. Please ensure you make payment manually before your plan expires to avoid workspace interruption.`
              }
            </div>

            <div class="footer">
              This is a computer-generated tax invoice issued by TaskFlow Systems. No signature is required.<br />
              Questions? Contact our billing support at support@taskflow.com
            </div>
          </div>
        </body>
        </html>
      `;

      const opt = {
        margin: 10,
        filename: `Invoice-${invNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const element = document.createElement('div');
      element.innerHTML = html;
      await html2pdf().set(opt).from(element).save();

      toast({
        title: "Invoice Downloaded",
        description: `Saved ${opt.filename} to your computer.`,
      });
    } catch (err) {
      console.error('Invoice download error:', err);
      toast({
        title: "Download Failed",
        description: "Could not generate invoice PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // ── Stripe Checkout Handler ──────────────────────────────────────────
  const handleUpgrade = async (plan) => {
    try {
      setPaymentLoading(plan);

      // 1. Create order on backend (returns Stripe Checkout URL)
      const { data } = await api.post('/billing/create-order', {
        plan,
        billingCycle,
      });

      // 2. Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Upgrade Failed',
        description: error.response?.data?.error || 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
      setPaymentLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      CANCELLED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    };
    return (
      <Badge
        variant="outline"
        className={`${styles[status] || styles.PENDING} px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase cursor-default select-none shadow-none pointer-events-none`}
      >
        {status}
      </Badge>
    );
  };

  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'STARTER': return <Zap className="w-5 h-5" />;
      case 'PRO': return <Sparkles className="w-5 h-5" />;
      case 'ENTERPRISE': return <ShieldCheck className="w-5 h-5" />;
      default: return <Crown className="w-5 h-5" />;
    }
  };

  const calculatePrice = (plan) => {
    if (!planData?.pricing) return '...';
    const price = plan === 'PRO' ? planData.pricing.pro : planData.pricing.starter;
    const users = Math.max(planData.currentUsers || 1, 25);
    let total = price * users;
    if (billingCycle === 'annually') {
      total = total * 12 * (1 - (planData.pricing.annualDiscount || 17) / 100);
    }
    return `₹ ${total.toLocaleString('en-IN')}`;
  };

  const getFeatures = (planName) => {
    const tiers = planData?.tiers || {};
    const tier = tiers[planName];

    if (tier?.points) {
      return tier.points.split('\n');
    }

    if (planName === 'STARTER') {
      return [
        `Up to ${tier?.maxUsers || 30} Users`,
        `${tier?.maxProjects || 5} Projects`,
        'Kanban Board',
        'Tasks Management',
        'Tickets & Support',
        'Team Management',
        'Chat & Collaboration',
        'Email Support',
      ];
    }
    if (planName === 'PRO') {
      return [
        `Up to ${tier?.maxUsers || 100} Users`,
        `${tier?.maxProjects || 50} Projects`,
        'Everything in Starter',
        'Performance Analytics',
        'Timesheets & Tracking',
        'GitHub Integration',
        'Activity Logs & Audit',
        'Priority Support',
      ];
    }
    return [
      'Unlimited team members',
      'Unlimited projects',
      'Everything in Pro',
      'SSO & SAML',
      'Custom Integrations',
      'Dedicated Account Manager',
      '24/7 Priority Support',
      'SLA Guarantee',
    ];
  };

  const plans = [
    {
      name: 'STARTER',
      title: 'Starter',
      description: planData?.tiers?.STARTER?.description || 'Essential tools for small teams',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-blue-500/20 to-blue-600/10',
      accent: 'text-blue-500',
      border: 'border-blue-500/30',
      btnClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20',
    },
    {
      name: 'PRO',
      title: 'Professional',
      description: planData?.tiers?.PRO?.description || 'Scale your business with ease',
      icon: <Sparkles className="w-6 h-6" />,
      popular: true,
      color: 'from-primary/30 to-primary/10',
      accent: 'text-primary',
      border: 'border-primary/50',
      btnClass: 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20',
    },
    {
      name: 'ENTERPRISE',
      title: 'Enterprise',
      description: planData?.tiers?.ENTERPRISE?.description || 'Maximum power and security',
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'from-purple-500/20 to-purple-600/10',
      accent: 'text-purple-500',
      border: 'border-purple-500/30',
      btnClass: 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Loading billing...</p>
        </div>
      </div>
    );
  }

  const currentPlan = planData?.plan || 'FREE';
  const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
  const daysRemaining = planData?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(planData.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const isPlanEndingSoonOrEnded = user?.organization?.isExpired || daysRemaining === null || daysRemaining <= 7;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ── EXPIRATION BANNER (FREE TRIAL EXPIRED) ── */}
      {user?.organization?.isExpired && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-4 shadow-lg shadow-red-500/5">
          <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-red-500 font-bold text-lg mb-1 tracking-tight">Your 14-Day Free Trial Has Expired</h3>
            <p className="text-sm text-red-500/80 font-medium">
              You currently do not have access to your workspace. Please select a plan below and upgrade to regain full access.
            </p>
          </div>
        </div>
      )}

      {/* ── EXPIRING SOON BANNER (ACTIVE PLAN) ── */}
      {currentPlan !== 'FREE' && planData?.currentPeriodEnd && (() => {
        const daysRemaining = Math.max(0, Math.ceil((new Date(planData.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)));
        if (daysRemaining > 7) return null;
        const isAutoRenew = planData.autoRenew !== false;
        return (
          <div className={cn(
            "rounded-2xl p-4 flex items-start sm:items-center justify-between shadow-lg relative border",
            isAutoRenew
              ? "bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/30"
              : "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30"
          )}>
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "p-2.5 rounded-xl border shrink-0 hidden sm:block",
                isAutoRenew
                  ? "bg-blue-500/20 border-blue-500/30 text-blue-500"
                  : "bg-amber-500/20 border-amber-500/30 text-amber-500"
              )}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className={cn(
                  "text-sm font-bold tracking-tight uppercase",
                  isAutoRenew ? "text-blue-500" : "text-amber-500"
                )}>
                  {isAutoRenew ? "Subscription Renews Soon (Auto-Debit Active)" : "Subscription Expiring Soon (Manual Renewal Required)"}
                </h4>
                <p className="text-xs text-foreground/80 font-medium mt-0.5">
                  {isAutoRenew ? (
                    <>
                      Your <strong>{currentPlan}</strong> plan will renew in <strong className="text-blue-500 font-bold">{daysRemaining} days</strong> ({format(new Date(planData.currentPeriodEnd), 'MMM dd, yyyy')}). <span className="font-semibold text-foreground">Auto-payment will be cut automatically from your card.</span>
                    </>
                  ) : (
                    <>
                      Your <strong>{currentPlan}</strong> plan expires in <strong className="text-amber-500 font-bold">{daysRemaining} days</strong> ({format(new Date(planData.currentPeriodEnd), 'MMM dd, yyyy')}). <span className="text-amber-500 font-semibold">Auto-renewal is OFF. Please renew manually to prevent workspace disruption.</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            {!isAutoRenew && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetPlan = plans.find(p => p.name === currentPlan);
                  if (targetPlan) setConfirmPlan(targetPlan);
                }}
                className="text-xs font-bold uppercase tracking-wider h-9 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 shrink-0 ml-3"
              >
                Renew Now
              </Button>
            )}
          </div>
        );
      })()}

      {/* ── HEADER ── */}
      {/* ── Current Plan Overview ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Card */}
        <Card className="lg:col-span-2 rounded-[2rem] border-border/40 bg-gradient-to-br from-primary/5 via-background to-primary/5 backdrop-blur-xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <CardHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                  {getPlanIcon(currentPlan)}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">
                    {currentPlan === 'FREE' ? 'Free Trial' : `${currentPlan} Plan`}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-semibold tracking-widest uppercase opacity-60">
                    Current Subscription
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "px-3.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase cursor-default select-none shadow-none pointer-events-none transition-colors",
                  planData?.status === 'ACTIVE'
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                    : planData?.status === 'TRIAL'
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                )}
              >
                {planData?.status || 'TRIAL'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Users', value: `${planData?.currentUsers || 0}/${planData?.maxUsers || 10}`, icon: Users, color: 'text-blue-500' },
                { label: 'Projects', value: `${planData?.maxProjects || 5} max`, icon: FolderKanban, color: 'text-emerald-500' },
                {
                  label: 'Renews',
                  value: planData?.currentPeriodEnd
                    ? format(new Date(planData.currentPeriodEnd), 'MMM dd, yyyy')
                    : 'N/A',
                  icon: CalendarDays,
                  color: 'text-amber-500',
                },
                { label: 'Plan Tier', value: currentPlan, icon: Crown, color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                  <div className={`w-9 h-9 rounded-xl bg-background border border-border/40 flex items-center justify-center ${stat.color} shadow-inner shrink-0`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">{stat.label}</p>
                    <p className="text-sm font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-Renewal Toggle & Notice */}
            <div className="mt-4 pt-4 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-background/60 border border-border/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-renew-switch"
                  checked={planData?.autoRenew !== false}
                  onCheckedChange={handleToggleAutoRenew}
                  disabled={updatingAutoRenew || currentPlan === 'FREE'}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="auto-renew-switch" className="text-xs font-bold text-foreground cursor-pointer">
                      Automatic Recurring Renewal
                    </label>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase cursor-default select-none shadow-none pointer-events-none",
                        planData?.autoRenew !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      )}
                    >
                      {planData?.autoRenew !== false ? "Auto-Debit ON" : "Manual Renewal"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {planData?.autoRenew !== false
                      ? `On ${planData?.currentPeriodEnd ? format(new Date(planData.currentPeriodEnd), 'MMM dd, yyyy') : 'renewal date'}, renewal payment will be deducted automatically from your stored payment card.`
                      : "Automatic renewal is disabled. You will need to renew manually each cycle to maintain workspace access."}
                  </p>
                </div>
              </div>
              {updatingAutoRenew && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Updating...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="rounded-[2rem] border-border/40 bg-white/50 dark:bg-black/40 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold tracking-tight">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Total Paid',
                value: `₹${invoices.filter(i => i.status === 'PAID').reduce((a, c) => a + Number(c.amount), 0).toLocaleString('en-IN')}`,
                icon: CheckCircle2,
                color: 'text-emerald-500',
              },
              {
                label: 'Pending',
                value: `₹${invoices.filter(i => i.status === 'PENDING').reduce((a, c) => a + Number(c.amount), 0).toLocaleString('en-IN')}`,
                icon: Clock,
                color: 'text-amber-500',
              },
              {
                label: 'Total Invoices',
                value: invoices.length,
                icon: CreditCard,
                color: 'text-primary',
              },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/10">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-background border border-border/40 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Upgrade Plans ─────────────────────────────────────────────── */}
      {currentPlan !== 'ENTERPRISE' && (
        <Card className="rounded-2xl md:rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          <CardHeader className="relative z-10 p-4 sm:p-8 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                  <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">Upgrade Your Plan</CardTitle>
                  <CardDescription className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase opacity-60">
                    Unlock more power for your team
                  </CardDescription>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border/20 w-fit">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase transition-all",
                    billingCycle === 'monthly'
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annually')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase transition-all",
                    billingCycle === 'annually'
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annually
                  <Badge
                    variant="outline"
                    className="ml-1 sm:ml-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0 shadow-none pointer-events-none"
                  >
                    Save {planData?.pricing?.annualDiscount || 17}%
                  </Badge>
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 p-4 sm:p-8 pt-2 sm:pt-4">
            {/* ── Mobile: Full-width Compact Stacked Cards ── */}
            <div className="md:hidden space-y-4">
              {plans.map((plan) => {
                const isSamePlan = currentPlan === plan.name;
                const isCurrentActivePlan = isSamePlan && planData?.status !== 'TRIAL' && !user?.organization?.isExpired;
                const isDowngrade = planOrder[plan.name] < planOrder[currentPlan];
                const canDowngrade = isDowngrade && isPlanEndingSoonOrEnded;
                const features = getFeatures(plan.name);

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative rounded-2xl overflow-hidden transition-all",
                      "bg-secondary/30 border backdrop-blur-md",
                      plan.border,
                      plan.popular ? "ring-1 ring-primary/30 bg-secondary/50" : "",
                      isSamePlan ? "ring-2 ring-primary/50" : ""
                    )}
                  >
                    {/* Top badge */}
                    {(plan.popular && !isSamePlan) && (
                      <div className="bg-primary text-white text-center py-1 text-[8px] font-bold tracking-[0.2em] uppercase">
                        MOST POPULAR
                      </div>
                    )}
                    {isSamePlan && (
                      <div className="bg-emerald-500 text-white text-center py-1 text-[8px] font-bold tracking-[0.2em] uppercase">
                        {isCurrentActivePlan ? 'CURRENT PLAN' : planData?.status === 'TRIAL' ? 'CURRENT TRIAL' : 'EXPIRED PLAN'}
                      </div>
                    )}

                    <div className="p-4">
                      {/* Header: icon + name + price row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-2 rounded-lg bg-gradient-to-br", plan.color)}>
                            <div className={cn(plan.accent, "[&>svg]:w-4 [&>svg]:h-4")}>{plan.icon}</div>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide leading-tight">{plan.title}</h3>
                            <p className="text-[9px] text-muted-foreground font-medium">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-extrabold text-foreground tracking-tight leading-tight">
                            {plan.name === 'ENTERPRISE' ? 'Custom' : calculatePrice(plan.name)}
                          </div>
                          {plan.name !== 'ENTERPRISE' && (
                            <span className="text-[9px] text-muted-foreground/60 font-medium">
                              per {billingCycle === 'monthly' ? 'month' : 'year'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features as pill tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {features.map((feature, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 border border-border/30 text-[10px] text-foreground/70 font-medium">
                            <Check className="w-2.5 h-2.5 text-primary stroke-[3px] shrink-0" />
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <Button
                        size="sm"
                        className={cn(
                          "w-full rounded-lg py-2.5 font-bold text-[9px] tracking-widest uppercase gap-1.5",
                          isCurrentActivePlan
                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30"
                            : isDowngrade && canDowngrade
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                              : isDowngrade && !canDowngrade
                                ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                                : plan.btnClass
                        )}
                        disabled={(isDowngrade && !canDowngrade) || paymentLoading !== null}
                        title={isDowngrade && !canDowngrade ? `Downgrading is only available when your current plan has ended or is ending soon (within 7 days). (${daysRemaining} days remaining)` : undefined}
                        onClick={() => {
                          if (plan.name === 'ENTERPRISE') {
                            window.location.href = 'mailto:sales@sspl.com?subject=Enterprise Plan Inquiry';
                            return;
                          }
                          setConfirmPlan(plan);
                        }}
                      >
                        {paymentLoading === plan.name ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                        ) : isCurrentActivePlan ? (
                          <>Renew Plan <ArrowUpRight className="w-3 h-3" /></>
                        ) : isSamePlan && (planData?.status === 'TRIAL' || user?.organization?.isExpired) ? (
                          <>Subscribe Now <ArrowUpRight className="w-3 h-3" /></>
                        ) : isDowngrade && canDowngrade ? (
                          <>Downgrade Plan <ArrowDownRight className="w-3 h-3" /></>
                        ) : isDowngrade && !canDowngrade ? (
                          'Downgrade N/A'
                        ) : plan.name === 'ENTERPRISE' ? (
                          <>Contact Sales <ArrowRight className="w-3 h-3" /></>
                        ) : (
                          <>Upgrade Now <ArrowUpRight className="w-3 h-3" /></>
                        )}
                      </Button>
                      {isDowngrade && !canDowngrade && daysRemaining !== null && (
                        <p className="text-[9px] text-muted-foreground/60 text-center mt-1.5 font-medium">
                          Available when plan ends soon ({daysRemaining} days remaining)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: 3-Column Grid ── */}
            <div className="hidden md:grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isSamePlan = currentPlan === plan.name;
                const isCurrentActivePlan = isSamePlan && planData?.status !== 'TRIAL' && !user?.organization?.isExpired;
                const isDowngrade = planOrder[plan.name] < planOrder[currentPlan];
                const canDowngrade = isDowngrade && isPlanEndingSoonOrEnded;

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative group flex flex-col p-6 rounded-[2rem] transition-all duration-500 hover:translate-y-[-4px]",
                      "bg-secondary/30 border backdrop-blur-md",
                      plan.border,
                      plan.popular ? "ring-1 ring-primary/30 shadow-2xl bg-secondary/50" : "",
                      isSamePlan ? "ring-2 ring-primary/50 shadow-xl" : ""
                    )}
                  >
                    {plan.popular && !isSamePlan && (
                      <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-primary text-white px-4 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg">
                        MOST POPULAR
                      </div>
                    )}
                    {isSamePlan && (
                      <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-emerald-500 text-white px-4 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg">
                        {isCurrentActivePlan ? 'CURRENT PLAN' : planData?.status === 'TRIAL' ? 'CURRENT TRIAL' : 'EXPIRED PLAN'}
                      </div>
                    )}

                    <div className={cn("p-3 rounded-xl w-fit mb-4 bg-gradient-to-br", plan.color)}>
                      <div className={plan.accent}>{plan.icon}</div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1 uppercase tracking-wider">{plan.title}</h3>
                    <p className="text-[11px] text-muted-foreground mb-5 leading-relaxed font-medium">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-extrabold text-foreground tracking-tighter">
                        {plan.name === 'ENTERPRISE' ? 'Custom' : calculatePrice(plan.name)}
                      </span>
                      {plan.name !== 'ENTERPRISE' && (
                        <span className="text-xs text-muted-foreground/60 font-bold">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    {plan.name !== 'ENTERPRISE' && (
                      <div className="text-[10px] text-muted-foreground font-semibold mb-6">
                        (Pricing for {Math.max(planData?.currentUsers || 1, 25)} users)
                      </div>
                    )}

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {getFeatures(plan.name).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[12px] text-foreground/80 font-medium">
                          <div className="shrink-0 p-0.5 rounded-full bg-primary/10 text-primary">
                            <Check className="w-2.5 h-2.5 stroke-[4px]" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full rounded-xl py-5 font-bold text-[10px] tracking-widest uppercase transition-all duration-300 gap-2",
                        isCurrentActivePlan
                          ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30"
                          : isDowngrade && canDowngrade
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                            : isDowngrade && !canDowngrade
                              ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                              : plan.btnClass
                      )}
                      disabled={(isDowngrade && !canDowngrade) || paymentLoading !== null}
                      title={isDowngrade && !canDowngrade ? `Downgrading is only available when your current plan has ended or is ending soon (within 7 days). (${daysRemaining} days remaining)` : undefined}
                      onClick={() => {
                        if (plan.name === 'ENTERPRISE') {
                          window.location.href = 'mailto:sales@sspl.com?subject=Enterprise Plan Inquiry';
                          return;
                        }
                        setConfirmPlan(plan);
                      }}
                    >
                      {paymentLoading === plan.name ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : isCurrentActivePlan ? (
                        <>Renew Plan <ArrowUpRight className="w-3.5 h-3.5" /></>
                      ) : isSamePlan && (planData?.status === 'TRIAL' || user?.organization?.isExpired) ? (
                        <>Subscribe Now <ArrowUpRight className="w-3.5 h-3.5" /></>
                      ) : isDowngrade && canDowngrade ? (
                        <>Downgrade Plan <ArrowDownRight className="w-3.5 h-3.5" /></>
                      ) : isDowngrade && !canDowngrade ? (
                        'Downgrade N/A'
                      ) : plan.name === 'ENTERPRISE' ? (
                        <>Contact Sales <ArrowRight className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Upgrade Now <ArrowUpRight className="w-3.5 h-3.5" /></>
                      )}
                    </Button>
                    {isDowngrade && !canDowngrade && daysRemaining !== null && (
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-2 font-medium">
                        Available when plan ends soon ({daysRemaining} days left)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6 text-muted-foreground/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] uppercase">
                Secure 256-bit encrypted payments via Stripe
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Payment History ────────────────────────────────────────────── */}
      <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight">Payment History</CardTitle>
              <CardDescription className="text-[10px] font-semibold tracking-widest uppercase opacity-60">
                All invoices and transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent bg-muted/30">
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 pl-8">Invoice</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70">Plan</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Date</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Status</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-right pr-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground/20" />
                        <p className="text-sm font-bold opacity-40 italic">No payment history yet</p>
                        <p className="text-[10px] text-muted-foreground/40">
                          {currentPlan !== 'FREE'
                            ? 'Invoices and transactions for your active subscription will appear here'
                            : 'Payments will appear here after your first upgrade'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-b border-border/20 hover:bg-primary/[0.04] transition-all">
                      <TableCell className="py-5 pl-8">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] font-bold text-primary/70 tracking-tighter bg-primary/5 px-2 py-0.5 rounded-md w-fit">
                            {invoice.invoiceNumber || `#${invoice.id.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 truncate max-w-[180px]">
                            {invoice.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 border-primary/20 text-primary/70 bg-primary/5">
                          {invoice.plan || 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className="text-sm font-bold text-foreground">
                          ₹{Number(invoice.amount).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-5 text-center">
                        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                          {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center justify-center">
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-right pr-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                          className="h-8 px-3 text-[11px] font-semibold gap-1.5 hover:bg-primary/10 hover:text-primary border-border/50 text-foreground"
                        >
                          {downloadingInvoiceId === invoice.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Download PDF</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> {confirmPlan && planOrder[confirmPlan.name] < planOrder[currentPlan] ? `Confirm Downgrade to ${confirmPlan.title}` : `Confirm Upgrade to ${confirmPlan?.title}`}
            </DialogTitle>
            <DialogDescription className="text-sm">
              You are about to {confirmPlan && planOrder[confirmPlan.name] < planOrder[currentPlan] ? 'downgrade' : 'upgrade'} your workspace to the <strong className="text-foreground uppercase tracking-wide">{confirmPlan?.title}</strong> plan on a <strong>{billingCycle}</strong> billing cycle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-secondary/30 rounded-xl p-4 my-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Selected Plan</span>
              <Badge className={cn("font-bold", confirmPlan?.badge)}>{confirmPlan?.title}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Billing Cycle</span>
              <span className="font-bold capitalize">{billingCycle}</span>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Amount to Pay</span>
              <span className="font-bold text-base text-foreground tracking-tight">
                {confirmPlan?.name ? calculatePrice(confirmPlan.name) : ''}
                <span className="text-xs text-muted-foreground ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </span>
            </div>
            {billingCycle === 'annually' && (
              <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> You are saving by choosing the annual plan!
              </p>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setConfirmPlan(null)}>
              Cancel
            </Button>
            <Button 
              className="w-full sm:w-auto gap-2" 
              onClick={() => {
                const planName = confirmPlan.name;
                setConfirmPlan(null);
                handleUpgrade(planName);
              }}
            >
              Proceed to Checkout <ArrowUpRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingPage;
