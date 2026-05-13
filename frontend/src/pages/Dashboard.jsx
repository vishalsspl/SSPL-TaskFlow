import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SearchableSelect
} from '@/components/ui/searchable-select';
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
  Activity,
  Plus,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LineChart, PieChart, BarChart } from '@/components/ui/charts'; // Make sure this path is correct or update charts
import ProjectOverview from '@/components/ProjectOverview';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setHeader } = useHeaderStore();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
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
    const firstName = user?.name?.split(' ')[0];
    const displayName = user?.name === 'System Admin' ? 'Admin' : firstName;
    const title = (
      <span className="text-base font-bold">
        Welcome back, <span className="text-primary">{displayName}</span>
      </span>
    );
    const description = user?.role === 'CLIENT'
      ? "Here's your project overview and insights."
      : "Overview of all projects and team performance";

    setHeader(title, description);

    fetchDashboardData();
    if (user?.role === 'ADMIN') {
      fetchPendingUsers();
    }
  }, [user, setHeader]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = Array.isArray(response.data) ? response.data : response.data.data || [];
      setProjects(projectsData);

      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }

      const totalProjects = projectsData.length;
      const activeProjects = projectsData.filter(p => ['ACTIVE', 'PLANNING', 'ON_HOLD'].includes(p.status)).length;
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
  const taskCompletionData = stats.totalTasks > 0 ? [
    { name: 'Mon', completed: 4 },
    { name: 'Tue', completed: 7 },
    { name: 'Wed', completed: 5 },
    { name: 'Thu', completed: 9 },
    { name: 'Fri', completed: 6 },
  ] : [];

  const teamContributionData = stats.activeProjects > 0 ? [
    { name: 'John Doe', value: 35 },
    { name: 'Jane Smith', value: 25 },
    { name: 'Bob Johnson', value: 20 },
    { name: 'Alice Williams', value: 20 },
  ] : [];

  const financialData = stats.totalProjects > 0 ? [
    { name: 'Project A', budget: 50000, spent: 35000 },
    { name: 'Project B', budget: 30000, spent: 28000 },
    { name: 'Project C', budget: 40000, spent: 15000 },
  ] : [];

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
    <div className="p-3 sm:p-8">
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
      <div className="flex-1 h-full overflow-y-auto space-y-4 p-0 sm:p-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          {projects.length > 1 && (
            <div className="flex items-center space-x-2">
              <SearchableSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                options={projects.map((project) => ({ label: project.name, value: project.id }))}
                placeholder="Select Project"
                className="w-[200px]"
              />
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
    <div className="flex-1 h-full overflow-y-auto space-y-4 sm:space-y-6 p-0 sm:p-2 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
        {/* Total Projects */}
        <Card
          className="border-0 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
          onClick={() => navigate('/projects')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <FolderKanban size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[9px] sm:text-xs font-black text-white/80 uppercase tracking-widest Montserrat leading-tight">Total Projects</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-4xl font-black text-white Montserrat">{stats.totalProjects}</div>
            <p className="text-xs text-white/60 mt-1 flex items-center gap-1 Montserrat">
              <TrendingUp className="w-3 h-3" /> All time scale
            </p>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card
          className="border-0 bg-gradient-to-br from-[#0EA5E9] to-[#0369A1] shadow-[0_10px_40px_-10px_rgba(14,165,233,0.3)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
          onClick={() => navigate('/projects')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <Activity size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[9px] sm:text-xs font-black text-white/80 uppercase tracking-widest Montserrat leading-tight">Active Work</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-4xl font-black text-white Montserrat">{stats.activeProjects}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-[#48A111] text-white border-0 text-[10px] px-2 Montserrat">LIVE</Badge>
              <span className="text-xs text-white/60 Montserrat">Running now</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card
          className="border-0 bg-gradient-to-br from-[#10B981] to-[#047857] shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
          onClick={() => navigate('/tasks')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <CheckCircle size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[9px] sm:text-xs font-black text-white/80 uppercase tracking-widest Montserrat leading-tight">Total Tasks</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-4xl font-black text-white Montserrat">{stats.totalTasks}</div>
            <p className="text-xs text-white/60 mt-1 Montserrat">Assigned units</p>
          </CardContent>
        </Card>



        {/* Total Budget - Restricted */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Card
            className="border-0 bg-gradient-to-br from-[#F59E0B] to-[#B45309] shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
            onClick={() => navigate('/projects')}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
              <BarChart3 size={120} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[9px] sm:text-xs font-black text-white/80 uppercase tracking-widest Montserrat leading-tight">Net Budget</CardTitle>
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="font-black text-white Montserrat"
                style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.875rem)' }}
              >
                {formatCurrency(stats.totalBudget)}
              </div>
              <p className="text-xs text-white/60 mt-1 Montserrat">Project allocation</p>
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <Card
            className="border-0 bg-gradient-to-br from-[#F43F5E] to-[#BE123C] shadow-[0_10px_40px_-10px_rgba(244,63,94,0.3)] relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300"
            onClick={() => navigate('/team')}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
              <UserCheck size={120} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[9px] sm:text-xs font-black text-white/80 uppercase tracking-widest Montserrat leading-tight">Pending</CardTitle>
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-4xl font-black text-white Montserrat">{pendingUsersCount}</div>
              <p className="text-xs text-white/60 mt-1 Montserrat">New requests</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-2 lg:col-span-4 bg-card border-border ring-1 ring-border shadow-2xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-3">
            <div>
              <CardTitle className="text-foreground Montserrat">Active Projects</CardTitle>
              <CardDescription className="text-gray-400 Montserrat">
                Recently updated projects and their status.
              </CardDescription>
            </div>
            {user?.role !== 'MEMBER' && (
              <Button
                onClick={() => navigate('/projects?create=true')}
                className="bg-primary hover:bg-primary/90 text-white Montserrat font-bold rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {(() => {
              const PROJECT_COLORS = [
                { border: '#8B5CF6', badge: 'rgba(139,92,246,0.1)', text: '#A78BFA' },
                { border: '#0EA5E9', badge: 'rgba(14,165,233,0.1)', text: '#7DD3FC' },
                { border: '#10B981', badge: 'rgba(16,185,129,0.1)', text: '#6EE7B7' },
                { border: '#F59E0B', badge: 'rgba(245,158,11,0.1)', text: '#FCD34D' },
                { border: '#F43F5E', badge: 'rgba(244,63,94,0.1)', text: '#FDA4AF' },
              ];

              const filteredActiveProjects = projects.filter(p => {
                return ['ACTIVE', 'PLANNING', 'ON_HOLD'].includes(p.status);
              });

              return (
                <>
                  <div className="space-y-4">
                    {filteredActiveProjects.slice(0, 5).map((project, idx) => {
                      const col = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all hover:bg-accent group border border-transparent hover:border-border mb-2"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.border, boxShadow: `0 0 8px ${col.border}` }} />
                              <p className="text-sm font-bold leading-none text-foreground Montserrat truncate">{project.name}</p>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 Montserrat leading-relaxed">
                              {project.description?.replace(/<[^>]*>/g, '')}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider pt-1">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3" style={{ color: col.border }} />
                                <span>{project._count?.tasks || 0} Tasks</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3" style={{ color: col.border }} />
                                <span className="truncate">{project.manager?.name || 'No manager'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4 shrink-0 space-y-1">
                            {project.totalBudget && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                              <p className="text-sm font-black Montserrat" style={{ color: col.text }}>{formatCurrency(Number(project.totalBudget))}</p>
                            )}
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: col.border }} />
                              </div>
                              <span className="text-[10px] font-black text-gray-400 Montserrat">{project.progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredActiveProjects.length === 0 && (
                      <div className="text-center py-12">
                        <FolderKanban className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-gray-500 Montserrat text-sm mb-6">No active projects found</p>
                        {user?.role !== 'MEMBER' && (
                          <Button
                            onClick={() => navigate('/projects?create=true')}
                            className="bg-primary hover:bg-primary/90 text-white Montserrat font-bold rounded-xl"
                          >
                            Create Project
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {filteredActiveProjects.length > 5 && (
                    <Button
                      variant="none"
                      className="w-full mt-6 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors Montserrat border border-border hover:bg-accent py-6"
                      onClick={() => navigate('/projects')}
                    >
                      View All Projects <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </>
              );
            })()}

          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="md:col-span-2 lg:col-span-3 space-y-4 sm:space-y-6">
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-bold Montserrat">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {taskCompletionData && taskCompletionData.length > 0 ? (
                <LineChart
                  data={taskCompletionData}
                  title="Task Completion"
                  series={[{ dataKey: 'completed', name: 'Completed', color: '#48A111' }]}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-accent/20">
                  <Activity className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No records to display</p>
                  <p className="text-sm">Complete tasks to see performance metrics here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Card className="bg-card border-border ring-1 ring-border shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground Montserrat">Budget Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {financialData && financialData.length > 0 ? (
                  <BarChart
                    data={financialData}
                    title="Budget vs Spent"
                    series={[
                      { dataKey: 'budget', name: 'Budget', color: '#0EA5E9' },
                      { dataKey: 'spent', name: 'Spent', color: '#F43F5E' }
                    ]}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-accent/20">
                    <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No records to display</p>
                    <p className="text-sm">Set up project budgets to view financial data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;