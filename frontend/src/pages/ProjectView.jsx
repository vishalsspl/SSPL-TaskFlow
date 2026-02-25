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
  ArrowLeft,
  FileText
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
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

  const handleTaskClick = (task) => {
    if (user?.role === 'CLIENT' || user?.role === 'MEMBER') return;
    setSelectedTask(task);
    setShowEditDialog(true);
  };

  const handleTaskUpdated = () => {
    setShowEditDialog(false);
    setSelectedTask(null);
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

  const exportProfessionalReport = async () => {
    try {
      const { project, overview, budget, phases, tasks } = dashboard;
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; }
            .cover { text-align: center; margin-bottom: 60px; padding-top: 100px; border-bottom: 4px solid #0f172a; padding-bottom: 40px; }
            .title { font-size: 36px; font-weight: 700; color: #020617; margin-bottom: 10px; }
            .client { font-size: 20px; color: #64748b; margin-bottom: 40px; }
            .date { font-size: 16px; color: #94a3b8; }
            
            .section { margin-bottom: 40px; page-break-inside: avoid; }
            h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 22px; color: #0f172a; margin-top: 0; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-item { margin-bottom: 10px; }
            .label { font-weight: 600; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 16px; color: #0f172a; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; }
            
            .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .badge-active { background-color: #dcfce7; color: #166534; }
            .badge-planning { background-color: #e0f2fe; color: #075985; }
            .badge-completed { background-color: #f1f5f9; color: #475569; }
            
            .summary-box { background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0f172a; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="cover">
            <div class="title">${project.name}</div>
            <div class="client">Project Status Report | ${project.client?.name || 'Internal'}</div>
            <div class="date">${today}</div>
          </div>

          <div class="section">
            <h2>1. Executive Summary</h2>
            <div class="summary-box">
              The "${project.name}" project is currently in its <strong>${project.status.toLowerCase().replace('_', ' ')}</strong> phase. 
              The project is tracking a progress of <strong>${overview.progressPercentage}%</strong> based on effort-based story points. 
              Current milestones are aligned with the target completion date of ${formatDate(project.endDate)}.
            </div>
          </div>

          <div class="section">
            <h2>2. Project Overview</h2>
            <div class="grid">
              <div class="info-item">
                <div class="label">Project Manager</div>
                <div class="value">${project.manager?.name || 'Unassigned'}</div>
              </div>
              <div class="info-item">
                <div class="label">Organization</div>
                <div class="value">TaskFlow</div>
              </div>
              <div class="info-item">
                <div class="label">Timeline</div>
                <div class="value">${formatDate(project.startDate)} - ${formatDate(project.endDate)}</div>
              </div>
              <div class="info-item">
                <div class="label">Current Status</div>
                <div class="value">${project.status.replace('_', ' ')}</div>
              </div>
            </div>
            ${project.description ? `
              <div style="margin-top: 20px;">
                <div class="label">Scope & Description</div>
                <div class="value" style="font-size: 14px;">${project.description}</div>
              </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>3. Timeline & Milestones</h2>
            <table>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                ${phases.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${p.status.replace('_', ' ')}</td>
                    <td>${p.completionPercentage}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>4. Task Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                ${(project.tasks || []).map(t => `
                  <tr>
                    <td>${t.title}</td>
                    <td>${t.priority}</td>
                    <td>${t.status.replace('_', ' ')}</td>
                    <td>${t.storyPoints || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>5. Budget Summary</h2>
            <div class="grid">
              <div class="info-item">
                <div class="label">Total Budget</div>
                <div class="value">$${project.totalBudget || '0.00'}</div>
              </div>
              <div class="info-item">
                <div class="label">Status</div>
                <div class="value">On Track</div>
              </div>
            </div>
          </div>

          <div class="footer">
            Report generated by TaskFlow | &copy; 2026 TaskFlow
          </div>
        </body>
        </html>
      `;

      const response = await api.post(`/reports/${id}/pdf`, { html }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project.name}-Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export professional report:', error);
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
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="mr-2 text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <h1 className="text-3xl font-black Montserrat text-white">{project.name}</h1>
            </div>

            <div className="flex items-center gap-4 text-gray-500 pl-14 Montserrat font-bold uppercase tracking-wider">
              {project.client && (
                <div className="flex items-center text-[11px]">
                  <Users className="w-4 h-4 mr-2 text-[#00A3FF]" />
                  <span>{project.client.name}</span>
                </div>
              )}
              <div className="flex items-center text-[11px]">
                <Calendar className="w-4 h-4 mr-2 text-[#8B5CF6]" />
                <span>Due {formatDate(project.endDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!presentationMode && (
              <>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="bg-white/5 border-white/10 text-white Montserrat font-bold rounded-xl px-4">
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                  <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90 text-white Montserrat font-bold rounded-xl px-4">
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={exportProfessionalReport} className="bg-white/5 border-white/10 text-white Montserrat font-bold rounded-xl px-4">
                  <Download className="w-4 h-4 mr-2" />
                  Report
                </Button>
                <Button onClick={() => setPresentationMode(true)} size="sm" className="bg-[#48A111] hover:bg-[#48A111]/90 text-white Montserrat font-bold rounded-xl px-4">
                  <Maximize className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </>
            )}
            {presentationMode && (
              <Button onClick={() => setPresentationMode(false)} className="bg-red-500 hover:bg-red-600 text-white Montserrat font-bold rounded-xl">Exit Mode</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border-white/10 p-1 rounded-2xl h-12">
            <TabsTrigger value="overview" className="rounded-xl px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-xl px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Tasks</TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Team Distribution</TabsTrigger>
          </TabsList>

          <div ref={dashboardRef} className="space-y-6">
            <TabsContent value="overview" className="space-y-6">
              {/* Phases */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {phases.map((phase) => {
                  const isComp = phase.status === 'COMPLETED';
                  const isProd = phase.status === 'IN_PROGRESS';
                  return (
                    <Card key={phase.id} className={`border-0 relative overflow-hidden group transition-all duration-500 ${isComp ? 'bg-gradient-to-br from-[#10B981] to-[#047857]' : isProd ? 'bg-gradient-to-br from-[#0EA5E9] to-[#0369A1]' : 'bg-[#0A0A0A] ring-1 ring-white/10'}`}>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
                        <h4 className={`font-black text-[10px] uppercase tracking-widest Montserrat ${isComp || isProd ? 'text-white/80' : 'text-gray-500'}`}>{phase.name}</h4>
                        {isComp ? (
                          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                        ) : isProd ? (
                          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            <div className="text-2xl font-black text-white Montserrat">{phase.completionPercentage}%</div>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/5 rounded-2xl">
                            <Clock className="w-8 h-8 text-gray-700" />
                          </div>
                        )}
                        <Badge variant="none" className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${isComp || isProd ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                          {phase.status.replace('_', ' ')}
                        </Badge>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    </Card>
                  );
                })}

                <Card className="border-0 bg-gradient-to-br from-[#F59E0B] to-[#B45309] shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] relative overflow-hidden group">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-1">
                    <h4 className="font-black text-[10px] text-white/80 uppercase tracking-widest Montserrat">Target Launch</h4>
                    <div className="text-4xl font-black text-white Montserrat">{overview.daysToLaunch}</div>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest Montserrat">Days Remaining</span>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                      <div className="h-full bg-white shadow-[0_0_10px_white]" style={{ width: '60%' }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Metrics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-[#0A0A0A] border-white/5 ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Capital Utilization</CardTitle>
                    <div className="p-1.5 bg-white/5 rounded-lg">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-white Montserrat">{formatCurrency(budget.used)}</div>
                    <p className="text-[10px] text-gray-500 mt-1 Montserrat font-bold italic">
                      Committed of {formatCurrency(project.totalBudget)}
                    </p>
                    <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary shadow-[0_0_8px_var(--primary-glow)]"
                        style={{ width: `${(budget.used / project.totalBudget) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                {/* Simplified metrics section - could add more here if needed */}
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
                          <div
                            key={task.id}
                            className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => handleTaskClick(task)}
                          >
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
                            <TableRow
                              key={task.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleTaskClick(task)}
                            >
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details, assignments, or story points for <strong>{project.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={[project]}
            users={users}
            task={selectedTask}
            onSuccess={handleTaskUpdated}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedTask(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectView;