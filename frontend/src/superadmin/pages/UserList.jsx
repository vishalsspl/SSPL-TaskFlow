import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserX, Building2, ChevronLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sub-components
import UserTable from '@/superadmin/components/users/UserTable';
import UserCards from '@/superadmin/components/users/UserCards';
import UserDeleteDialog from '@/superadmin/components/users/UserDeleteDialog';

const SuperAdminUserList = () => {
  const { setHeader, searchTerm: globalSearch } = useHeaderStore();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(false);
  const [roleFilter, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotal] = useState(1);
  const [deleteTarget, setDelete] = useState(null);

  useEffect(() => {
    setHeader('Registry: Galactic Identity', 'Universal synchronization of all biological and synthetic entities', {
      showSearch: true,
      searchPlaceholder: 'Search by name, email or affiliation...'
    });
    fetchOrgs();
  }, [setHeader]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchUsers();
    }
  }, [page, roleFilter, globalSearch, selectedOrgId]);

  // ── API calls ─────────────────────────────────────────────────────────

  const fetchOrgs = async () => {
    setOrgLoading(true);
    try {
      const res = await api.get('/superadmin/orgs', { params: { limit: 100 } });
      setOrgs(res.data.data || res.data || []);
    } catch {
      toast({ title: 'Failed to fetch sectors', variant: 'destructive' });
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/users', {
        params: { 
          page, 
          limit: 20, 
          role: roleFilter || undefined, 
          search: globalSearch || undefined,
          organizationId: selectedOrgId 
        },
      });
      const data = res.data;
      setUsers(data.data || data || []);
      setTotal(data.pagination?.totalPages || 1);
    } catch {
      toast({ title: 'Failed to synchronize lifeforms', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const forceReset = async (user) => {
    try {
      await api.post(`/superadmin/users/${user.id}/force-reset`);
      toast({ title: `Access override initiated for ${user.name}` });
    } catch (err) {
      toast({ title: 'Override Failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  const deleteUser = async () => {
    try {
      await api.delete(`/superadmin/users/${deleteTarget.id}`);
      toast({ title: 'Entity terminated successfully' });
      setDelete(null);
      fetchUsers();
    } catch (err) {
      toast({ title: 'Termination Failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  // ── Badge helper ──────────────────────────────────────────────────────

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Command</Badge>;
      case 'MANAGER': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Overlord</Badge>;
      case 'MEMBER': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Operator</Badge>;
      case 'CLIENT': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Guest</Badge>;
      default: return <Badge variant="secondary" className="text-xs font-semibold rounded-lg px-2">{role}</Badge>;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4">
      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          {!selectedOrgId ? (
            <div className="flex flex-col mb-8 p-1 mt-4">
              <h2 className="text-2xl font-bold mb-1 tracking-widest uppercase">Select Sector</h2>
              <p className="text-muted-foreground text-xs font-medium">Choose an organization to manage its biological and synthetic entities.</p>
            </div>
          ) : (
            <div className="bg-secondary/40 p-2 rounded-2xl mb-6 mt-4 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
              <div className="flex flex-col xl:flex-row items-center justify-between gap-6 w-full px-4 py-2">
                <div className="flex flex-col">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest text-[10px] p-0 h-auto mb-2 justify-start"
                    onClick={() => setSelectedOrgId(null)}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back to Sectors
                  </Button>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    {orgs.find(o => o.id === selectedOrgId)?.name || 'Loading...'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <div className="relative flex-1 sm:flex-none min-w-[200px]">
                    <SearchableSelect
                      value={roleFilter}
                      onChange={(val) => { setRole(val); setPage(1); }}
                      options={[
                        { label: 'All Users', value: '' },
                        { label: 'ADMIN', value: 'ADMIN' },
                        { label: 'MANAGER', value: 'MANAGER' },
                        { label: 'MEMBER', value: 'MEMBER' },
                        { label: 'CLIENT', value: 'CLIENT' }
                      ]}
                      placeholder="All Users"
                      searchPlaceholder="Search echelon..."
                      className="w-full h-14 rounded-lg bg-white/50 dark:bg-black/50 border-border/40 hover:bg-accent/20 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            {!selectedOrgId ? (
              orgLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-40 rounded-xl bg-muted/20 animate-pulse border border-border/10" />
                  ))}
                </div>
              ) : orgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-xl">
                  <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">No organizations found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-8">
                  {orgs.map((org) => (
                    <Card
                      key={org.id}
                      className="p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-4 border-border/40 bg-white/5 backdrop-blur-sm"
                      onClick={() => { setSelectedOrgId(org.id); setPage(1); }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight mb-1">{org.name}</h3>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-primary/5 border-primary/20 text-primary px-1.5 h-4 font-bold">{org.plan || 'Free'}</Badge>
                           <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{org.industry || 'Enterprise'}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse border border-border/10" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <Card className="p-32 text-center rounded-xl border-dashed border-2 border-border/20 bg-muted/5">
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-16 h-16 bg-muted/20 rounded-xl mx-auto flex items-center justify-center">
                      <UserX className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-medium text-muted-foreground">No Entities Found</h3>
                    <p className="text-sm text-muted-foreground/60">Registry search returned zero active or dormant lifeforms in this sector.</p>
                  </div>
                </Card>
              ) : (
                <>
                  <UserTable users={users} getRoleBadge={getRoleBadge} onForceReset={forceReset} onDelete={setDelete} />
                  <UserCards users={users} getRoleBadge={getRoleBadge} onForceReset={forceReset} onDelete={setDelete} />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-6 border-t border-border/10 mt-auto">
                      <p className="text-xs font-medium text-muted-foreground opacity-50">
                        Showing {(page - 1) * 20 + 1} - {Math.min(users.length + (page - 1) * 20, page * 20)} Entities Synced
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          className="h-10 rounded-lg px-6 border border-border/10 font-semibold text-xs hover:bg-primary/5 transition-all"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Previous Sector
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-lg px-8 shadow-sm font-semibold text-xs transition-all hover:bg-primary hover:text-white"
                          disabled={page === totalPages}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Next Sector
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <UserDeleteDialog deleteTarget={deleteTarget} setDelete={setDelete} onConfirm={deleteUser} />
    </div>
  );
};

export default SuperAdminUserList;