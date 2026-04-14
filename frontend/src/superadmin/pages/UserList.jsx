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
    setHeader('All Users', 'View and manage users across all organizations', {
      showSearch: true,
      searchPlaceholder: 'Search by name, email, or organization...'
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
      toast({ title: 'Could not load organizations', variant: 'destructive' });
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
          limit: 10, 
          role: roleFilter || undefined, 
          search: globalSearch || undefined,
          organizationId: selectedOrgId 
        },
      });
      const data = res.data;
      setUsers(data.data || data || []);
      setTotal(data.pagination?.totalPages || 1);
    } catch {
      toast({ title: 'Could not load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const forceReset = async (user) => {
    try {
      await api.post(`/superadmin/users/${user.id}/force-reset`);
      toast({ title: `Password reset sent to ${user.name}` });
    } catch (err) {
      toast({ title: 'Reset Failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  const deleteUser = async () => {
    try {
      await api.delete(`/superadmin/users/${deleteTarget.id}`);
      toast({ title: 'User deleted successfully' });
      setDelete(null);
      fetchUsers();
    } catch (err) {
      toast({ title: 'Delete Failed', description: err.response?.data?.error, variant: 'destructive' });
    }
  };

  // ── Badge helper ──────────────────────────────────────────────────────

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Admin</Badge>;
      case 'MANAGER': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Manager</Badge>;
      case 'MEMBER': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Member</Badge>;
      case 'CLIENT': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50 text-xs font-semibold rounded-lg px-2 shadow-sm">Client</Badge>;
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
              <h2 className="text-2xl font-bold mb-1 tracking-widest uppercase">Select Organization</h2>
              <p className="text-muted-foreground text-xs font-medium">Choose an organization to manage its users.</p>
            </div>
          ) : (
            <div className="relative overflow-hidden bg-card/40 backdrop-blur-md rounded-3xl mb-8 mt-4 border border-border/40 shadow-xl group">
              {/* Subtle gradient background decoration */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />
              
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full p-6 sm:p-8">
                <div className="flex flex-col gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group/back w-fit flex items-center gap-2 text-muted-foreground/60 hover:text-primary transition-all font-bold uppercase tracking-widest text-[9px] p-0 h-auto"
                    onClick={() => setSelectedOrgId(null)}
                  >
                    <div className="p-1.5 rounded-full bg-secondary group-hover/back:bg-primary group-hover/back:text-primary-foreground transition-all duration-300">
                      <ChevronLeft className="w-3 h-3" />
                    </div>
                    Back to Organizations
                  </Button>
                  
                  <div className="flex items-center gap-5">
                    <div className="hidden sm:flex w-14 h-14 bg-primary/10 rounded-2xl items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        {orgs.find(o => o.id === selectedOrgId)?.name || 'Organization Details'}
                      </h2>
                      <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                        <span className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          Managed Workspace
                        </span>
                        <span>•</span>
                        <span>{users.length} Active Users</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                  <div className="relative w-full sm:w-[240px]">
                    <div className="absolute -top-6 left-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                      Filter by Access Role
                    </div>
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
                      placeholder="Show All Roles"
                      searchPlaceholder="Search role..."
                      className="w-full h-11 rounded-xl bg-background/50 border-border/30 hover:border-primary/30 transition-all font-bold text-xs"
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
                    <h3 className="font-medium text-muted-foreground">No Users Found</h3>
                    <p className="text-sm text-muted-foreground/60">No users found in this organization.</p>
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
                        Showing {(page - 1) * 10 + 1} - {Math.min(users.length + (page - 1) * 10, page * 10)} Users
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
                          disabled={page === totalPages}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Next
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