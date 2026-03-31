import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  FileText,
  Plus,
  DollarSign,
  Layers
} from 'lucide-react';
import { formatCurrency, formatDate, priorityColors } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreateTaskForm from '@/components/forms/CreateTaskForm';
import Chat from '@/components/Chat';
import { useTimerStore } from '@/store/timerStore';
import WorkLogPanel from '@/components/WorkLogPanel';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const { setHeader } = useHeaderStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const startTimer = useTimerStore(state => state.startTimer);
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
      const data = response.data;
      setDashboard(data);

      const { project } = data;
      const description = project.client
        ? `Client: ${project.client.name} • Due: ${formatDate(project.endDate)}`
        : `Due: ${formatDate(project.endDate)}`;
      setHeader(project.name, description);

      // Also fetch users for task assignment if not already loaded
      if (users.length === 0) {
        const usersResponse = await api.get('/users', { params: { teamOnly: 'true' } });
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
      const response = await api.post(`/reports/${id}/pdf`, { html }, { responseType: 'blob' });
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

  const overviewContent = (
    <TabsContent value="overview" className="space-y-6 mt-0">
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

      {/* Project Description */}
      {project.description && (
        <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Project Scope & Description</CardTitle>
            <div className="p-1.5 bg-white/5 rounded-lg">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-400 Montserrat leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Total Commitment</CardTitle>
              <div className="p-2 bg-white/5 rounded-xl"><DollarSign className="h-4 w-4 text-[#F59E0B]" /></div>
            </CardHeader>
            <CardContent className="min-w-0 pb-8">
              <div className="text-3xl lg:text-4xl font-black text-foreground Montserrat truncate">{formatCurrency(project.totalBudget)}</div>
              <p className="text-[11px] text-gray-400 mt-2 Montserrat font-bold italic tracking-wide">Primary Project Investment</p>
              <div className="mt-6 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] w-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </div>
            </CardContent>
          </Card>
        )}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Current Utilization</CardTitle>
              <div className="p-1.5 bg-white/5 rounded-lg"><Clock className="h-3.5 w-3.5 text-[#00A3FF]" /></div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-xl font-black text-foreground Montserrat truncate">{formatCurrency(budget.used)}</div>
              <p className="text-[10px] text-gray-500 mt-1 Montserrat font-bold italic">{budget.usedPercentage.toFixed(1)}% of total consumed</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#00A3FF] shadow-[0_0_8px_rgba(0,163,255,0.5)] transition-all duration-1000" style={{ width: `${budget.usedPercentage}%` }} />
              </div>
            </CardContent>
          </Card>
        )}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">NET Balance (Remaining)</CardTitle>
              <div className="p-1.5 bg-white/5 rounded-lg">
                <div className="w-3.5 h-3.5 rounded-full bg-[#48A111]/20 flex items-center justify-center"><CheckCircle className="h-3 w-3 text-[#48A111]" /></div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-xl font-black text-[#48A111] Montserrat truncate">{formatCurrency(budget.remaining)}</div>
              <p className="text-[10px] text-gray-500 mt-1 Montserrat font-bold italic">Available for allocation</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#48A111] shadow-[0_0_8px_rgba(72,161,17,0.5)] transition-all duration-1000" style={{ width: `${Math.max(0, 100 - budget.usedPercentage)}%` }} />
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Effort Completion</CardTitle>
            <div className="p-1.5 bg-white/5 rounded-lg"><Layers className="h-3.5 w-3.5 text-[#8B5CF6]" /></div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-xl font-black text-foreground Montserrat truncate">{overview.progressPercentage}%</div>
            <p className="text-[10px] text-gray-500 mt-1 Montserrat font-bold italic">{overview.completedStoryPoints} of {overview.totalStoryPoints} pts done</p>
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-all duration-1000" style={{ width: `${overview.progressPercentage}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );

  const mainContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header: project title on left, action buttons on right */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {!presentationMode && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-black Montserrat text-foreground truncate">{project.name}</h2>
            {project.endDate && (
              <p className="text-xs text-muted-foreground Montserrat font-medium mt-0.5">
                DUE: {new Date(project.endDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!presentationMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="bg-secondary border-border text-foreground Montserrat font-bold rounded-xl px-4">
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground Montserrat font-bold rounded-xl px-4">
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportProfessionalReport} className="bg-secondary border-border text-foreground Montserrat font-bold rounded-xl px-4">
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
            <Button onClick={() => setPresentationMode(false)} className="bg-red-500 hover:bg-red-600 text-white Montserrat font-bold rounded-xl px-4">
              Exit Presentation Mode
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: sticky list + scrollable content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 bg-secondary border-border p-1 rounded-2xl flex-wrap">
          <TabsTrigger value="overview" className="rounded-xl px-4 sm:px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-xl px-4 sm:px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tasks</TabsTrigger>
          <TabsTrigger value="team" className="rounded-xl px-4 sm:px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Team</TabsTrigger>
          {user?.role !== 'CLIENT' && (
            <TabsTrigger value="chat" className="rounded-xl px-4 sm:px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chat</TabsTrigger>
          )}
          <TabsTrigger value="worklogs" className="rounded-xl px-4 sm:px-6 Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Worklogs</TabsTrigger>
        </TabsList>

        {/* Only this div scrolls */}
        <div ref={dashboardRef} className="flex-1 overflow-y-auto mt-4 pb-4">
          {overviewContent}

          <TabsContent value="tasks" className="space-y-4 mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Upcoming Deadlines</CardTitle></CardHeader>
                <CardContent>
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-4">
                      {upcomingDeadlines.map(task => (
                        <div key={task.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={() => handleTaskClick(task)}>
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">Assigned to: {task.assignees?.map(a => a.user?.name).join(', ') || 'Unassigned'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user?.role !== 'CLIENT' && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); startTimer(task.id, id, task.title); }}>
                                <Clock className="w-4 h-4" />
                              </Button>
                            )}
                            <Badge variant="outline">{task.daysUntilDue} days</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Overdue Tasks</CardTitle></CardHeader>
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
                          <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTaskClick(task)}>
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

          <TabsContent value="team" className="space-y-4 mt-0">
            <Card>
              <CardHeader><CardTitle>Workload Distribution</CardTitle></CardHeader>
              <CardContent className="pl-2">
                {workloadChartData && workloadChartData.some(w => w.workload > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-accent/20 mx-4 mb-4">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No workload data available</p>
                    <p className="text-sm">Assign tasks to team members to see workload distribution.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role !== 'CLIENT' && (
            <TabsContent value="chat" className="mt-0 h-[calc(100%-1rem)]">
              <div className="h-full min-h-[500px]">
                <Chat
                  projectId={id}
                  title={`${project.name} Discussions`}
                  onBack={() => setActiveTab('overview')}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="worklogs" className="space-y-4 mt-0">
            <WorkLogPanel projectId={id} />
          </TabsContent>
        </div>
      </Tabs>


    </div>
  );

  return (
    <>
      {presentationMode ? (
        createPortal(
          <div className="fixed inset-0 bg-background z-[100] overflow-y-auto animate-in fade-in zoom-in duration-300 p-4 sm:p-8">
            {mainContent}
          </div>,
          document.body
        )
      ) : (
        mainContent
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-2 sm:mb-4">
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to <strong>{project.name}</strong>.</DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={[project]}
            users={users}
            initialProjectId={project.id}
            onSuccess={() => { setShowCreateDialog(false); fetchDashboard(true); }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-2 sm:mb-4">
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details for <strong>{project.name}</strong>.</DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={[project]}
            users={users}
            task={selectedTask}
            onSuccess={handleTaskUpdated}
            onCancel={() => { setShowEditDialog(false); setSelectedTask(null); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectView;
