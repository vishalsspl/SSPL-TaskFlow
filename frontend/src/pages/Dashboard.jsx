import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { LineChart, PieChart, BarChart } from '@/components/ui/charts';
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
    // If client has no projects yet or logic requires explicit selection, handled in fetch
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

  // Placeholder data for charts - replace with actual API data
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
      PLANNING: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      ON_HOLD: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || colors.PLANNING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Client Dashboard View
  if (user?.role === 'CLIENT') {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Project Overview and Insights
              </p>
            </div>
            {projects.length > 1 && (
              <div className="flex items-center gap-3">
                <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
                  Select Project:
                </label>
                <select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedProjectId ? (
            <ProjectOverview projectId={selectedProjectId} />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Projects Found</h3>
              <p className="text-gray-500 mt-2">You don't have any active projects yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of all projects and team performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProjects}</p>
                  <p className="text-sm text-green-600 mt-2 flex items-center">
                    <span className="font-medium">{stats.activeProjects} Active</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTasks}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Across all projects
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeProjects}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    In progress
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(stats.totalBudget)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    All projects
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {user?.role === 'ADMIN' && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200 bg-orange-50"
              onClick={() => navigate('/team')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Pending Users</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{pendingUsersCount}</p>
                    <p className="text-sm text-orange-700 mt-2">
                      {pendingUsersCount > 0 ? 'Awaiting approval' : 'All approved'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Projects</CardTitle>
              <Button variant="outline" onClick={() => navigate('/projects')}>
                View All
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.filter(p => p.status === 'ACTIVE').slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{project.description}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{project._count?.tasks || 0} tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{project.manager?.name || 'No manager'}</span>
                      </div>
                      {project.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due {formatDate(project.endDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {project.totalBudget && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Budget</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(Number(project.totalBudget))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {projects.filter(p => p.status === 'ACTIVE').length === 0 && (
                <div className="text-center py-12">
                  <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active projects</p>
                  <Button className="mt-4" onClick={() => navigate('/projects/new')}>
                    Create Project
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <LineChart
                  data={taskCompletionData}
                  title="Task Completion Rate"
                  series={[{ dataKey: 'completed', name: 'Completed Tasks', color: '#8884d8' }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <PieChart
                  data={teamContributionData}
                  title="Team Member Contributions"
                  dataKey="value"
                  nameKey="name"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Progress</h2>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.description}</p>
                <div className="mt-2">
                  <progress value={project.progress} max="100" className="w-full h-2"></progress>
                  <p className="text-xs text-gray-500 mt-1">{project.progress}% Complete</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Overview</h2>
          <Card>
            <CardContent>
              <BarChart
                data={financialData}
                title="Budget vs Expenditure"
                series={[
                  { dataKey: 'budget', name: 'Budget', color: '#82ca9d' },
                  { dataKey: 'spent', name: 'Spent', color: '#8884d8' }
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Client-Specific Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">Custom KPI 1</p>
                <p className="text-2xl font-bold text-gray-900">Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">Custom KPI 2</p>
                <p className="text-2xl font-bold text-gray-900">Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">Custom KPI 3</p>
                <p className="text-2xl font-bold text-gray-900">Value</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
