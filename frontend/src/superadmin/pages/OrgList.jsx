import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sub-components
import OrgFilters from '@/superadmin/components/orgs/OrgFilters';
import OrgTable from '@/superadmin/components/orgs/OrgTable';
import OrgCards from '@/superadmin/components/orgs/OrgCards';
import OrgEditDialog from '@/superadmin/components/orgs/OrgEditDialog';
import OrgCreateDialog from '@/superadmin/components/orgs/OrgCreateDialog';
import DeleteConfirmDialog from '@/components/ui/delete-confirm-dialog';

const OrgList = () => {
  const { setHeader, searchTerm: globalSearch } = useHeaderStore();
  const { toast } = useToast();

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [planFilter, setPlan] = useState('');
  const [editOrg, setEditOrg] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [globalTiers, setGlobalTiers] = useState(null);
  const itemsPerPage = 10;

  const [newOrg, setNewOrg] = useState({
    name: '', industry: '', size: '', website: '', country: '', timezone: 'Asia/Kolkata', plan: 'FREE',
    adminName: '', adminEmail: '', adminPassword: '',
  });

  useEffect(() => {
    setHeader('Organizations', 'View and manage all organizations and their plans', {
      showSearch: true,
      searchPlaceholder: 'Search organizations or industries...'
    });
    fetchOrgs();
    fetchGlobalTiers();
  }, [setHeader]);

  useEffect(() => {
    setPage(1);
  }, [globalSearch, statusFilter, planFilter]);

  // ── API calls ─────────────────────────────────────────────────────────

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations');
      setOrgs(res.data.data || res.data || []);
    } catch {
      toast({ title: 'Failed to load organisations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalTiers = async () => {
    try {
      const res = await api.get('/superadmin/settings');
      const s = res.data || {};
      const tiers = {
        FREE: { maxUsers: 10, maxProjects: 3, features: {} },
        STARTER: { maxUsers: 30, maxProjects: 5, features: {} },
        PRO: { maxUsers: 100, maxProjects: 50, features: {} },
        ENTERPRISE: { maxUsers: 1000, maxProjects: 500, features: {} }
      };
      
      ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].forEach(p => {
        const lp = p.toLowerCase();
        if (s[`${lp}_max_users`]) tiers[p].maxUsers = Number(s[`${lp}_max_users`]);
        if (s[`${lp}_max_projects`]) tiers[p].maxProjects = Number(s[`${lp}_max_projects`]);
        if (s[`${lp}_features`]) {
          try {
            tiers[p].features = typeof s[`${lp}_features`] === 'string' 
              ? JSON.parse(s[`${lp}_features`]) 
              : s[`${lp}_features`];
          } catch (e) {
            console.error(`Failed to parse features for ${p}`, e);
          }
        }
      });
      setGlobalTiers(tiers);
    } catch (e) {
      console.error('Failed to fetch global tiers:', e);
    }
  };

  const saveOrg = async () => {
    setSaving(true);
    try {
      await api.put(`/superadmin/orgs/${editOrg.id}`, {
        name: editOrg.name,
        plan: editOrg.plan,
        status: editOrg.status,
        maxUsers: Number(editOrg.maxUsers),
        maxProjects: Number(editOrg.maxProjects),
        suspendedReason: editOrg.suspendedReason || null,
        trialEndsAt: editOrg.trialEndsAt || null,
        customFeatures: editOrg.customFeatures || {},
        adminId: editOrg.adminId || undefined,
        adminName: editOrg.adminName || undefined,
        adminEmail: editOrg.adminEmail || undefined,
        adminPassword: editOrg.adminPassword || undefined
      });
      toast({ title: 'Organisation updated' });
      setEditOrg(null);
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Failed to update', description: err.response?.data?.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const provisionOrg = async () => {
    if (!newOrg.name || !newOrg.industry || !newOrg.size || !newOrg.website || !newOrg.country || !newOrg.plan || !newOrg.adminName || !newOrg.adminEmail || !newOrg.adminPassword) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOrg.adminEmail.trim())) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/signup', {
        name: newOrg.adminName,
        email: newOrg.adminEmail,
        password: newOrg.adminPassword,
        organizationName: newOrg.name,
        industry: newOrg.industry,
        size: newOrg.size,
        website: newOrg.website,
        country: newOrg.country,
        timezone: newOrg.timezone || 'Asia/Kolkata',
      });
      if (newOrg.plan !== 'FREE') {
        const res = await api.get('/organizations');
        const created = (res.data.data || res.data || []).find(o => o.name === newOrg.name);
        if (created) {
          await api.patch(`/organizations/${created.id}`, { plan: newOrg.plan, status: 'ACTIVE' });
        }
      }
      toast({ title: 'Organisation provisioned', description: `Created ${newOrg.name} with admin ${newOrg.adminEmail}` });
      setCreateOpen(false);
      setNewOrg({ name: '', industry: '', size: '', website: '', country: '', timezone: 'Asia/Kolkata', plan: 'FREE', adminName: '', adminEmail: '', adminPassword: '' });
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Provisioning failed', description: err.response?.data?.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const quickSuspend = async (org) => {
    const newStatus = org.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await api.patch(`/organizations/${org.id}`, { status: newStatus });
      toast({ title: `Organisation ${newStatus === 'SUSPENDED' ? 'suspended' : 'activated'}` });
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Action failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  const approvePending = async (org) => {
    try {
      await api.patch(`/organizations/${org.id}`, { status: 'TRIAL' });
      toast({ title: 'Organisation Approved', description: 'Administrator has been notified via email.' });
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Action failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  const deleteOrg = async (org) => {
    setOrgToDelete(org);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!orgToDelete) return;
    try {
      await api.delete(`/organizations/${orgToDelete.id}`);
      toast({ title: 'Organisation Deleted' });
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Action failed', description: err.response?.data?.error, variant: 'destructive' });
    } finally {
      setShowDeleteDialog(false);
      setOrgToDelete(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────

  const filtered = orgs.filter(o => {
    const s = globalSearch.toLowerCase();
    return (
      (!s || o.name.toLowerCase().includes(s) || o.industry?.toLowerCase().includes(s)) &&
      (!statusFilter || o.status === statusFilter) &&
      (!planFilter || o.plan === planFilter)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedOrgs = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // ── Badge helpers ─────────────────────────────────────────────────────

  const getStatusBadge = (status) => {
    const map = { ACTIVE: 'bg-green-500', TRIAL: 'bg-orange-500', PENDING: 'bg-yellow-500', SUSPENDED: 'bg-red-600', CANCELLED: 'bg-slate-400' };
    return <Badge className={`${map[status] ?? 'bg-slate-400'} text-xs font-semibold text-white`}>{status}</Badge>;
  };

  const getPlanBadge = (plan) => {
    const map = { PRO: 'border-indigo-200 text-indigo-600 bg-indigo-50', STARTER: 'border-blue-200 text-blue-600 bg-blue-50', ENTERPRISE: 'border-amber-200 text-amber-600 bg-amber-50', FREE: 'border-slate-200 text-slate-600 bg-slate-50' };
    return <Badge variant="outline" className={`${map[plan] ?? map.FREE} text-xs font-semibold `}>{plan}</Badge>;
  };

  // ── Edit handler ──────────────────────────────────────────────────────

  const handleEdit = (org) => {
    const admin = org.users?.[0] || {};
    setEditOrg({
      ...org,
      customFeatures: org.customFeatures || {},
      adminId: admin.id || '',
      adminName: admin.name || '',
      adminEmail: admin.email || '',
      adminPassword: ''
    });
  };

  // ── Render ────────────────────────────────────────────────────────────

  const handleCreateOpenChange = (open) => {
    setCreateOpen(open);
    if (!open) {
      setNewOrg({ name: '', industry: '', size: '', website: '', country: '', timezone: 'Asia/Kolkata', plan: 'FREE', adminName: '', adminEmail: '', adminPassword: '' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          <div className="bg-secondary/40 p-2 rounded-2xl mb-6 mt-4 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
            <OrgFilters
              statusFilter={statusFilter}
              setStatus={setStatus}
              planFilter={planFilter}
              setPlan={setPlan}
              onProvision={() => setCreateOpen(true)}
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            {loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-medium text-muted-foreground animate-pulse">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center border-2 border-dashed border-border/20 rounded-xl bg-muted/5">
                <Building2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-xs font-medium text-muted-foreground opacity-40">No Organization Records Found</p>
              </div>
            ) : (
              <>
                <OrgTable
                  orgs={paginatedOrgs}
                  getStatusBadge={getStatusBadge}
                  getPlanBadge={getPlanBadge}
                  onEdit={handleEdit}
                  onSuspend={quickSuspend}
                  onApprove={approvePending}
                  onDelete={deleteOrg}
                />
                <OrgCards
                  orgs={paginatedOrgs}
                  getStatusBadge={getStatusBadge}
                  getPlanBadge={getPlanBadge}
                  onEdit={handleEdit}
                  onSuspend={quickSuspend}
                  onApprove={approvePending}
                  onDelete={deleteOrg}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-6 border-t border-border/10 mt-auto">
                    <p className="text-xs font-medium text-muted-foreground opacity-50">
                      Showing {Math.min(filtered.length, (page - 1) * itemsPerPage + 1)} - {Math.min(filtered.length, page * itemsPerPage)} of {filtered.length} Organizations
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        className="h-10 rounded-lg px-6 border border-border/10 font-semibold text-xs hover:bg-primary/5"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 rounded-lg px-8 shadow-sm font-semibold text-xs transition-all hover:bg-primary hover:text-white"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OrgEditDialog 
        editOrg={editOrg} 
        setEditOrg={setEditOrg} 
        onSave={saveOrg} 
        saving={saving} 
        globalTiers={globalTiers}
      />
      <OrgCreateDialog open={createOpen} onOpenChange={handleCreateOpenChange} newOrg={newOrg} setNewOrg={setNewOrg} onProvision={provisionOrg} saving={saving} />
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Organisation"
        description={`Are you absolutely sure you want to delete ${orgToDelete?.name}? This action cannot be undone and will remove all organization data.`}
      />
    </div>
  );
};

export default OrgList;