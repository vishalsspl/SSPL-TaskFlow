import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Search, 
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
  const { setHeader } = useHeaderStore();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    setHeader('Global Billing', 'Manage platform-wide subscriptions and financial records');
    fetchInvoices();
  }, [setHeader]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/billing/invoices');
      setInvoices(res.data.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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
      fetchInvoices();
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
    const matchesSearch = inv.organization.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* ── Stats Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `$${invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}`, icon: CreditCard, color: 'text-primary' },
          { label: 'Pending Payments', value: `$${invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}`, icon: Clock, color: 'text-amber-500' },
          { label: 'Overdue Amount', value: `$${invoices.filter(i => i.status === 'OVERDUE').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}`, icon: AlertCircle, color: 'text-rose-500' },
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">Invoice Repository</CardTitle>
              <CardDescription className="text-[10px] font-bold tracking-widest uppercase opacity-60">System-wide financial transaction records</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                <Input 
                  placeholder="Search org or description..." 
                  className="pl-10 h-11 w-64 rounded-xl border-border/40 bg-background/50 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 gap-2">
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
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="px-8 text-[10px] font-black tracking-widest uppercase opacity-50">Invoice ID</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase opacity-50">Organization</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase opacity-50">Amount</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase opacity-50">Date</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase opacity-50">Status</TableHead>
                  <TableHead className="text-right px-8 text-[10px] font-black tracking-widest uppercase opacity-50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Streaming data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <p className="text-sm font-bold opacity-40 italic">No billing records found</p>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-border/10 hover:bg-primary/[0.02] transition-colors group">
                    <TableCell className="px-8 font-mono text-[10px] font-bold text-muted-foreground">
                      #{invoice.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">{invoice.organization.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">{invoice.organization.billingEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-black text-foreground">${Number(invoice.amount).toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</span>
                        {invoice.dueDate && (
                          <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">Due: {format(new Date(invoice.dueDate), 'MMM dd')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="px-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 bg-black/90 backdrop-blur-xl p-1">
                            {invoice.status === 'PENDING' && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                                className="flex items-center gap-3 px-3 py-2 text-emerald-500 focus:text-white focus:bg-emerald-500 rounded-lg cursor-pointer text-[10px] font-bold tracking-widest uppercase"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 text-white focus:bg-primary/20 rounded-lg cursor-pointer text-[10px] font-bold tracking-widest uppercase">
                              <ExternalLink className="w-4 h-4" /> View Organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBilling;
