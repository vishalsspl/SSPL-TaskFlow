import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  FolderKanban,
  ArrowUpRight,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LineChart, PieChart, BarChart } from '@/components/ui/charts'; // Make sure this path is correct or update charts
import ProjectOverview from '@/components/ProjectOverview';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalBudget: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    if (user?.role === 'ADMIN') {
      fetchPendingUsers();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = response.data;
      setProjects(projectsData);

      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }

      const totalProjects = projectsData.length;
      const activeProjects = projectsData.filter(p => p.status === 'ACTIVE').length;
      const totalTasks = projectsData.reduce((sum, p) => sum + (p._count?.tasks || 0), 0);
      const totalBudget = projectsData.reduce((sum, p) => sum + Number(p.totalBudget || 0), 0);

      setStats({
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks: 0,
        totalBudget,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get('/users?pending=true');
      setPendingUsersCount(response.data.length);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    }
  };

  // Placeholder data for charts
  const taskCompletionData = [
    { name: 'Mon', completed: 4 },
    { name: 'Tue', completed: 7 },
    { name: 'Wed', completed: 5 },
    { name: 'Thu', completed: 9 },
    { name: 'Fri', completed: 6 },
  ];

  const teamContributionData = [
    { name: 'John Doe', value: 35 },
    { name: 'Jane Smith', value: 25 },
    { name: 'Bob Johnson', value: 20 },
    { name: 'Alice Williams', value: 20 },
  ];

  const financialData = [
    { name: 'Project A', budget: 50000, spent: 35000 },
    { name: 'Project B', budget: 30000, spent: 28000 },
    { name: 'Project C', budget: 40000, spent: 15000 },
  ];

  const getStatusColor = (status) => {
    const colors = {
      PLANNING: 'secondary', // Shadcn badge variant
      ACTIVE: 'default',
      ON_HOLD: 'outline',
      COMPLETED: 'success', // If you have a success variant, otherwise 'secondary'
      CANCELLED: 'destructive',
    };
    return colors[status] || 'outline';
  };

  const DashboardSkeleton = () => (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Client Dashboard View
  if (user?.role === 'CLIENT') {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Project Overview and Insights
            </p>
          </div>
          {projects.length > 1 && (
            <div className="flex items-center space-x-2">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {selectedProjectId ? (
          <ProjectOverview projectId={selectedProjectId} />
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Projects Found</h3>
            <p className="text-muted-foreground mt-2">You don't have any active projects yet.</p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of all projects and team performance
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects — Purple gradient */}
        <Card className="relative overflow-hidden border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #4F34C7 0%, #7C3AED 100%)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Total Projects</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalProjects}</div>
            <p className="text-xs text-purple-200 mt-1">
              {stats.activeProjects} Active
            </p>
          </CardContent>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
        </Card>

        {/* Total Tasks — Sky Blue gradient */}
        <Card className="relative overflow-hidden border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-sky-100">Total Tasks</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalTasks}</div>
            <p className="text-xs text-sky-200 mt-1">
              Across all projects
            </p>
          </CardContent>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
        </Card>

        {/* Active Projects — Neon Green gradient */}
        <Card className="relative overflow-hidden border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #15803D 0%, #48A111 100%)' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Active Projects</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.activeProjects}</div>
            <p className="text-xs text-green-200 mt-1">
              In progress
            </p>
          </CardContent>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
        </Card>

        {/* Total Budget — Amber gradient */}
        {user?.role !== 'MEMBER' && (
          <Card className="relative overflow-hidden border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">Total Budget</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalBudget)}</div>
              <p className="text-xs text-amber-200 mt-1">
                All projects
              </p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
          </Card>
        )}

        {/* Pending Users — Orange gradient */}
        {user?.role === 'ADMIN' && (
          <Card
            className="relative overflow-hidden border-0 shadow-lg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)' }}
            onClick={() => navigate('/team')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Pending Users</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{pendingUsersCount}</div>
              <p className="text-xs text-orange-200 mt-1">
                {pendingUsersCount > 0 ? 'Awaiting approval' : 'All approved'}
              </p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>
                Recently updated projects and their status.
              </CardDescription>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Color palette cycling through project rows */}
              {(() => {
                const PROJECT_COLORS = [
                  { border: '#7C3AED', badge: 'rgba(124,58,237,0.15)', text: '#C4B5FD' },
                  { border: '#0EA5E9', badge: 'rgba(14,165,233,0.15)', text: '#7DD3FC' },
                  { border: '#48A111', badge: 'rgba(72,161,17,0.15)', text: '#86EFAC' },
                  { border: '#F59E0B', badge: 'rgba(245,158,11,0.15)', text: '#FCD34D' },
                  { border: '#F43F5E', badge: 'rgba(244,63,94,0.15)', text: '#FDA4AF' },
                ];
                const filteredList = projects.filter(p => {
                  const isActive = p.status === 'ACTIVE';
                  const matchesType = typeFilter === 'ALL' ? true : p.category === typeFilter;
                  return isActive && matchesType;
                });
                return filteredList.slice(0, 5).map((project, idx) => {
                  const col = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] mb-2"
                      style={{ borderLeft: `4px solid ${col.border}`, background: col.badge }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold leading-none text-white">{project.name}</p>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: col.badge, color: col.border, border: `1px solid ${col.border}` }}
                          >
                            {project.status.toLowerCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {project.description?.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" style={{ color: col.border }} />
                            <span>{project._count?.tasks || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" style={{ color: col.border }} />
                            <span>{project.manager?.name || 'No manager'}</span>
                          </div>
                          {project.endDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" style={{ color: col.border }} />
                              <span>Due {formatDate(project.endDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        {project.totalBudget && (
                          <p className="text-sm font-semibold" style={{ color: col.text }}>{formatCurrency(Number(project.totalBudget))}</p>
                        )}
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                          style={{ background: col.badge, color: col.border }}
                        >{project.progress}%</span>
                      </div>
                    </div>
                  );
                });
              })()}


              {projects.filter(p => {
                const isActive = p.status === 'ACTIVE';
                const matchesType = typeFilter === 'ALL' ? true : p.category === typeFilter;
                return isActive && matchesType;
              }).length === 0 && (
                  <div className="text-center py-8">
                    <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No active {typeFilter !== 'ALL' ? typeFilter.toLowerCase() : ''} projects</p>
                    <Button onClick={() => navigate('/projects/new')}>Create Project</Button>
                  </div>
                )}
            </div>
            {projects.filter(p => {
              const isActive = p.status === 'ACTIVE';
              const matchesType = typeFilter === 'ALL' ? true : p.category === typeFilter;
              return isActive && matchesType;
            }).length > 5 && (
                <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/projects')}>
                  View All Projects <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              )}
          </CardContent>
        </Card>

        {/* Charts Section - Keeping placeholders clean */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <LineChart
                data={taskCompletionData}
                title="Task Completion"
                series={[{ dataKey: 'completed', name: 'Completed', color: '#48A111' }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <BarChart
                data={financialData}
                title="Budget vs Spent"
                series={[
                  { dataKey: 'budget', name: 'Budget', color: '#38BDF8' },
                  { dataKey: 'spent', name: 'Spent', color: '#F472B6' }
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;
