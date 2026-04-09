import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreditCard,
  Filter,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';

const SuperAdminBilling = () => {
  const { setHeader, searchTerm: globalSearch, setSearchTerm } = useHeaderStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setHeader('Billing', 'Manage payments and invoices for all organizations', {
      showSearch: true,
      searchPlaceholder: 'Search org or description...'
    });
    fetchData();
  }, [setHeader]);

  useEffect(() => {
    setPage(1);
  }, [globalSearch, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, setRes] = await Promise.all([
        api.get('/superadmin/billing/invoices'),
        api.get('/superadmin/settings').catch(() => ({ data: {} }))
      ]);
      setSettings(setRes.data || {});
      setInvoices(invRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Could not load billing records',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/superadmin/billing/invoices/${id}/status`, { status });
      toast({ title: `Invoice marked as ${status}` });
      fetchData();
    } catch (error) {
      toast({
        title: 'Update failed',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">PAID</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">PENDING</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">OVERDUE</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.organization.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      inv.description?.toLowerCase().includes(globalSearch.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getInvoiceAmount = (invoice) => {
    const usersCount = invoice.userCount || invoice.organization?._count?.users || 0;

    // If we don't have settings or users, just show what's stored in the database
    if (!settings || usersCount === 0) return Number(invoice.amount);

    // Dynamic calculation for non-Enterprise plans
    if (invoice.plan === 'PRO') return (Number(settings.pro_per_user_price) || 15000) * usersCount;
    if (invoice.plan === 'STARTER') return (Number(settings.starter_per_user_price) || 5000) * usersCount;
    if (invoice.plan === 'ENTERPRISE') return null; // Custom handling

    return Number(invoice.amount);
  };

  const getUnitPrice = (invoice) => {
    if (invoice.plan === 'PRO') return Number(settings?.pro_per_user_price) || 15000;
    if (invoice.plan === 'STARTER') return Number(settings?.starter_per_user_price) || 5000;
    return null;
  };

  return (
    <div className="space-y-8 pb-20">
      {/* ── Stats Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + (getUnitPrice(curr) || Number(curr.amount) || 0), 0).toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-primary' },
          { label: 'Pending Payments', value: `₹${invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + (getUnitPrice(curr) || Number(curr.amount) || 0), 0).toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-500' },
          { label: 'Overdue Amount', value: `₹${invoices.filter(i => i.status === 'OVERDUE').reduce((acc, curr) => acc + (getUnitPrice(curr) || Number(curr.amount) || 0), 0).toLocaleString('en-IN')}`, icon: AlertCircle, color: 'text-rose-500' },
          { label: 'Active Invoices', value: invoices.length, icon: CheckCircle2, color: 'text-emerald-500' }
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2rem] border-border/40 bg-white/50 dark:bg-black/40 backdrop-blur-xl shadow-xl overflow-hidden group transition-all hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
                  <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center ${stat.color} shadow-inner`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Billing Table ────────────────────────────────────────── */}
      <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">All Invoices</CardTitle>
              <CardDescription className="text-[10px] font-bold tracking-widest uppercase opacity-60">Payment records for all organizations</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" /> Generate Invoice
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-8 pb-4 flex items-center gap-2">
          {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'secondary' : 'ghost'}
              className={`h-8 px-4 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${statusFilter === status ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground'}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent bg-muted/30">
                  <TableHead className="hidden lg:table-cell px-8 h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70 text-center">Invoice ID</TableHead>
                  <TableHead className="h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70 text-center">Source & Organization</TableHead>
                  <TableHead className="h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70 text-center">Billing Details</TableHead>
                  <TableHead className="hidden sm:table-cell h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70 text-center">Billing Date</TableHead>
                  <TableHead className="h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70 text-center">Payment Status</TableHead>
                  <TableHead className="text-center px-8 h-14 text-[10px] font-black tracking-widest uppercase text-foreground/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Loading...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <p className="text-sm font-bold opacity-40 italic">No billing records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.slice((page - 1) * 10, page * 10).map((invoice) => (
                    <TableRow key={invoice.id} className="border-b border-border/20 hover:bg-primary/[0.04] transition-all group duration-300">
                      <TableCell className="hidden lg:table-cell px-8 py-6">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-[10px] font-black text-primary/70 tracking-tighter bg-primary/5 px-2 py-1 rounded-md w-fit">
                            #{invoice.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-foreground">{invoice.organization.name}</span>
                          <span className="text-[10px] text-muted-foreground/60 font-bold tracking-tight truncate max-w-[120px]">{invoice.organization.billingEmail || 'No Email'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-base font-black text-foreground [text-shadow:0_1px_1px_rgba(0,0,0,0.05)]">
                            {getUnitPrice(invoice) !== null ? `₹${getUnitPrice(invoice).toLocaleString('en-IN')}` : 'Custom'}
                          </span>
                          <div className="flex items-center justify-center gap-2">
                             <Badge variant="outline" className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0 border-primary/20 text-primary/70 bg-primary/5">{invoice.plan || 'Custom'}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-6">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</span>
                          {invoice.dueDate && (
                            <span className="text-[9px] text-rose-500/80 font-bold uppercase tracking-[0.1em] mt-0.5">Expires: {format(new Date(invoice.dueDate), 'MMM dd')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center justify-center">
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 text-center">
                        <div className="flex items-center justify-center gap-2 transition-all">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-2xl border-border/40 bg-background dark:bg-black/95 backdrop-blur-xl shadow-2xl p-2 font-montserrat">
                              {invoice.status === 'PENDING' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                                  className="flex items-center gap-3 px-4 py-3 text-emerald-500 focus:text-white focus:bg-emerald-500 rounded-xl cursor-pointer text-[10px] font-black tracking-widest uppercase transition-all"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSearchTerm(invoice.organization.name);
                                  navigate('/superadmin/orgs');
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-foreground dark:text-white focus:bg-primary/10 rounded-xl cursor-pointer text-[10px] font-black tracking-widest uppercase transition-all"
                              >
                                <ExternalLink className="w-4 h-4 text-primary" />
                                <span>View Organization</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredInvoices.length > 10 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-6 border-t border-border/10 mt-auto">
              <p className="text-xs font-medium text-muted-foreground opacity-50">
                Showing {(page - 1) * 10 + 1} - {Math.min(filteredInvoices.length, page * 10)} of {filteredInvoices.length} Invoices
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="h-10 rounded-lg px-6 border border-border/10 font-semibold text-xs hover:bg-primary/5 transition-all"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg px-8 shadow-sm font-semibold text-xs transition-all hover:bg-primary hover:text-white"
                  disabled={page >= Math.ceil(filteredInvoices.length / 10)}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBilling;
