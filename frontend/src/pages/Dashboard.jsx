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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} Active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              All projects
            </p>
          </CardContent>
        </Card>

        {user?.role === 'ADMIN' && (
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors border-orange-200 bg-orange-50/50"
            onClick={() => navigate('/team')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Pending Users</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{pendingUsersCount}</div>
              <p className="text-xs text-orange-700">
                {pendingUsersCount > 0 ? 'Awaiting approval' : 'All approved'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>
              Recently updated projects and their status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.filter(p => p.status === 'ACTIVE').slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">{project.name}</p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{project.manager?.name || 'No manager'}</span>
                      </div>
                      {project.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Due {formatDate(project.endDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {project.totalBudget && (
                      <p className="text-sm font-medium">{formatCurrency(Number(project.totalBudget))}</p>
                    )}
                    <Badge variant="secondary" className="mt-1">{project.progress}%</Badge>
                  </div>
                </div>
              ))}

              {projects.filter(p => p.status === 'ACTIVE').length === 0 && (
                <div className="text-center py-8">
                  <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No active projects</p>
                  <Button onClick={() => navigate('/projects/new')}>Create Project</Button>
                </div>
              )}
            </div>
            {projects.filter(p => p.status === 'ACTIVE').length > 5 && (
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
                series={[{ dataKey: 'completed', name: 'Completed', color: '#8884d8' }]}
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
                  { dataKey: 'budget', name: 'Budget', color: '#82ca9d' },
                  { dataKey: 'spent', name: 'Spent', color: '#8884d8' }
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
