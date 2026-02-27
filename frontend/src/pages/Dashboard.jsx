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
  Activity,
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
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-muted-foreground Montserrat text-sm">
            Overview of all projects and team performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Total Projects */}
        <Card className="border-0 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <FolderKanban size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-white/80 uppercase tracking-widest Montserrat">Total Projects</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white Montserrat">{stats.totalProjects}</div>
            <p className="text-xs text-white/60 mt-1 flex items-center gap-1 Montserrat">
              <TrendingUp className="w-3 h-3" /> All time scale
            </p>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="border-0 bg-gradient-to-br from-[#0EA5E9] to-[#0369A1] shadow-[0_10px_40px_-10px_rgba(14,165,233,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <Activity size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-white/80 uppercase tracking-widest Montserrat">Active Work</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white Montserrat">{stats.activeProjects}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-[#48A111] text-white border-0 text-[10px] px-2 Montserrat">LIVE</Badge>
              <span className="text-xs text-white/60 Montserrat">Running now</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card className="border-0 bg-gradient-to-br from-[#10B981] to-[#047857] shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
            <CheckCircle size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-white/80 uppercase tracking-widest Montserrat">Task Velocity</CardTitle>
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white Montserrat">{stats.totalTasks}</div>
            <p className="text-xs text-white/60 mt-1 Montserrat">Assigned units</p>
          </CardContent>
        </Card>



        {/* Total Budget - Restricted */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Card className="border-0 bg-gradient-to-br from-[#F59E0B] to-[#B45309] shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
              <BarChart3 size={120} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-black text-white/80 uppercase tracking-widest Montserrat">Net Budget</CardTitle>
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
          <Card className="border-0 bg-gradient-to-br from-[#F43F5E] to-[#BE123C] shadow-[0_10px_40px_-10px_rgba(244,63,94,0.3)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[2] transition-transform duration-700">
              <UserCheck size={120} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-black text-white/80 uppercase tracking-widest Montserrat">Pending</CardTitle>
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-white Montserrat">{pendingUsersCount}</div>
              <p className="text-xs text-white/60 mt-1 Montserrat">New requests</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-[#0A0A0A] border-white/5 ring-1 ring-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-white Montserrat">Active Projects</CardTitle>
              <CardDescription className="text-gray-400 Montserrat">
                Recently updated projects and their status.
              </CardDescription>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white Montserrat">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10 text-white">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {(() => {
                const PROJECT_COLORS = [
                  { border: '#8B5CF6', badge: 'rgba(139,92,246,0.1)', text: '#A78BFA' },
                  { border: '#0EA5E9', badge: 'rgba(14,165,233,0.1)', text: '#7DD3FC' },
                  { border: '#10B981', badge: 'rgba(16,185,129,0.1)', text: '#6EE7B7' },
                  { border: '#F59E0B', badge: 'rgba(245,158,11,0.1)', text: '#FCD34D' },
                  { border: '#F43F5E', badge: 'rgba(244,63,94,0.1)', text: '#FDA4AF' },
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
                      className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all hover:bg-white/5 group border border-transparent hover:border-white/10 mb-2"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.border, boxShadow: `0 0 8px ${col.border}` }} />
                          <p className="text-sm font-bold leading-none text-white Montserrat truncate">{project.name}</p>
                          <Badge
                            variant="none"
                            className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: col.badge, color: col.border, border: `1px solid ${col.border}30` }}
                          >
                            {project.category}
                          </Badge>
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
                });
              })()}

              {projects.filter(p => {
                const isActive = p.status === 'ACTIVE';
                const matchesType = typeFilter === 'ALL' ? true : p.category === typeFilter;
                return isActive && matchesType;
              }).length === 0 && (
                  <div className="text-center py-12">
                    <FolderKanban className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-gray-500 Montserrat text-sm mb-6">No active {typeFilter !== 'ALL' ? typeFilter.toLowerCase() : ''} projects found</p>
                    <Button
                      onClick={() => navigate('/projects/new')}
                      className="bg-primary hover:bg-primary/90 text-white Montserrat font-bold rounded-xl"
                    >
                      Create Project
                    </Button>
                  </div>
                )}
            </div>
            {projects.filter(p => {
              const isActive = p.status === 'ACTIVE';
              const matchesType = typeFilter === 'ALL' ? true : p.category === typeFilter;
              return isActive && matchesType;
            }).length > 5 && (
                <Button
                  variant="none"
                  className="w-full mt-6 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors Montserrat border border-white/5 hover:bg-white/5 py-6"
                  onClick={() => navigate('/projects')}
                >
                  View All Projects <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="col-span-3 space-y-6">
          <Card className="bg-[#0A0A0A] border-white/5 ring-1 ring-white/5 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-white Montserrat">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <LineChart
                data={taskCompletionData}
                title="Task Completion"
                series={[{ dataKey: 'completed', name: 'Completed', color: '#48A111' }]}
              />
            </CardContent>
          </Card>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Card className="bg-[#0A0A0A] border-white/5 ring-1 ring-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-white Montserrat">Budget Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <BarChart
                  data={financialData}
                  title="Budget vs Spent"
                  series={[
                    { dataKey: 'budget', name: 'Budget', color: '#0EA5E9' },
                    { dataKey: 'spent', name: 'Spent', color: '#F43F5E' }
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
