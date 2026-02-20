import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  Maximize,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatDate, priorityColors } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreateTaskForm from '@/components/CreateTaskForm';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const dashboardRef = useRef(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboard();
  }, [id]);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      const response = await api.get(`/dashboard/${id}`);
      setDashboard(response.data);

      // Also fetch users for task assignment if not already loaded
      if (users.length === 0) {
        const usersResponse = await api.get('/users');
        const teamMembers = usersResponse.data.filter(u => u.role !== 'CLIENT');
        setUsers(teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboard(true);
  };

  const exportToPDF = async () => {
    // Implementation remains same
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const html = `<!DOCTYPE html><html><body><h1>${dashboard.project.name}</h1><img src="${imgData}" /></body></html>`;
      const response = await api.post(`/reports/${id}/pdf`, { html });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dashboard.project.name}-dashboard.pdf`;
      link.click();
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const exportToPNG = async () => {
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dashboard.project.name}-dashboard.png`;
        link.click();
      });
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-destructive">Failed to load dashboard</div>
      </div>
    );
  }

  const { project, overview, budget, phases, overdueTasks, workloads, upcomingDeadlines } = dashboard;
  const workloadChartData = workloads.map((w) => ({ name: w.user.name, workload: w.workloadPercentage }));

  return (
    <div className={`space-y-6 ${presentationMode ? 'fixed inset-0 bg-background z-50 overflow-auto p-8' : 'p-8'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {!presentationMode && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="mr-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground pl-12">
              {project.client && (
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{project.client.name}</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Due {formatDate(project.endDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!presentationMode && (
              <>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                  <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={exportToPNG}>
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
                <Button onClick={() => setPresentationMode(true)} size="sm">
                  <Maximize className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </>
            )}
            {presentationMode && (
              <Button onClick={() => setPresentationMode(false)}>Exit</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team & Workload</TabsTrigger>
          </TabsList>

          <div ref={dashboardRef} className="space-y-6">
            <TabsContent value="overview" className="space-y-4">
              {/* Phases */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {phases.map((phase) => (
                  <Card key={phase.id} className={phase.status === 'COMPLETED' ? 'bg-green-50/50 border-green-200' : 'bg-card'}>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                      <h4 className="font-medium text-sm">{phase.name}</h4>
                      {phase.status === 'COMPLETED' ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      ) : phase.status === 'IN_PROGRESS' ? (
                        <div className="text-2xl font-bold text-primary">{phase.completionPercentage}%</div>
                      ) : (
                        <Clock className="w-8 h-8 text-muted-foreground/30" />
                      )}
                      <Badge variant="outline" className="text-[10px]">{phase.status.replace('_', ' ')}</Badge>
                    </CardContent>
                  </Card>
                ))}

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                    <h4 className="font-medium text-sm">Launch In</h4>
                    <div className="text-3xl font-bold text-primary">{overview.daysToLaunch}</div>
                    <span className="text-xs text-muted-foreground">Days</span>
                  </CardContent>
                </Card>
              </div>

              {/* Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
                    <span className="text-muted-foreground">$</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(budget.used)}</div>
                    <p className="text-xs text-muted-foreground">of {formatCurrency(project.totalBudget)}</p>
                  </CardContent>
                </Card>
                {/* Add more metrics as needed */}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No upcoming deadlines</p>
                    ) : (
                      <div className="space-y-4">
                        {upcomingDeadlines.map(task => (
                          <div key={task.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">Assigned to: {task.assignees?.map(a => a.user?.name).join(', ') || 'Unassigned'}</p>
                            </div>
                            <Badge variant="outline">{task.daysUntilDue} days</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Overdue Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overdueTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-4 text-green-600">
                        <CheckCircle className="w-8 h-8 mb-2" />
                        <p>No overdue tasks!</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Overdue</TableHead>
                            <TableHead>Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overdueTasks.map(task => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">{task.title}</TableCell>
                              <TableCell className="text-red-600 font-bold">{task.daysOverdue} days</TableCell>
                              <TableCell><Badge className={priorityColors[task.priority]}>{task.priority}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Workload Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to <strong>{project.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={[project]}
            users={users}
            initialProjectId={project.id}
            onSuccess={() => {
              setShowCreateDialog(false);
              fetchDashboard(true);
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectView;