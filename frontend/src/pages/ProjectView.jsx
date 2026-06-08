import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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
  Layers,
  Trash2,
  MoreVertical,
  Mail,
  UserX
} from 'lucide-react';
import { formatCurrency, formatDate, priorityColors } from '@/lib/utils';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
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
import TaskDetailsModal from '@/components/task/TaskDetailsModal';
import Chat from '@/components/Chat';



const ProjectView = () => {
  const { toast } = useToast();
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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const dashboardRef = useRef(null);
  const { user } = useAuthStore();
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);


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
    if (user?.role === 'CLIENT') return;
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const checkCanEditTask = (task) => {
    if (!task) return false;
    return user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.['tasks.editAny'] || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      await api.delete(`/projects/${id}/members/${memberToRemove.user.id}`);
      setHeader(null, null); // Clear header to force refresh on next fetch if needed
      fetchDashboard(true);
      toast({
        title: "Member Removed",
        description: `${memberToRemove.user.name} has been removed from the project.`,
      });
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove member.",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(false);
    }
  };

  const handleTaskUpdated = () => {
    setShowEditDialog(false);
    setSelectedTask(null);
    fetchDashboard(true);
  };

  const exportToPDF = async () => {
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const container = document.createElement('div');
      container.innerHTML = `<h1>${dashboard.project.name}</h1><img src="${imgData}" style="max-width: 100%;" />`;
      
      const opt = {
        margin: 10,
        filename: `${dashboard.project.name}-dashboard.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      html2pdf().set(opt).from(container).save();
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF.",
        variant: "destructive"
      });
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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; padding: 0; margin: 0; }
            .container { padding: 30px 40px; }
            .cover { text-align: center; margin-bottom: 40px; padding-top: 20px; border-bottom: 3px solid #0f172a; padding-bottom: 30px; }
            .title { font-size: 32px; font-weight: 700; color: #020617; margin-bottom: 8px; }
            .client { font-size: 16px; color: #64748b; margin-bottom: 15px; font-weight: 500; }
            .date { font-size: 13px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .section { margin-bottom: 35px; page-break-inside: avoid; }
            h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 18px; color: #0f172a; margin-top: 0; font-weight: 600; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .info-item { background: #f8fafc; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #3b82f6; }
            .label { font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .value { font-size: 14px; color: #0f172a; font-weight: 500; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tr { page-break-inside: avoid; }
            
            .summary-box { background-color: #f0fdfa; padding: 15px 20px; border-radius: 6px; border-left: 4px solid #0d9488; color: #0f766e; font-size: 13px; line-height: 1.6; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; background: #e2e8f0; color: #334155; }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-in-progress { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="cover">
              <div class="title">${project.name}</div>
              <div class="client">Project Status Report | ${project.client?.name || 'Internal'}</div>
              <div class="date">${today}</div>
            </div>

            <div class="section">
              <h2>1. Executive Summary</h2>
              <div class="summary-box">
                The "${project.name}" project is currently in its <strong>${project.status.toLowerCase().replace('_', ' ')}</strong> phase. 
                ${project.name.toLowerCase() !== 'general' && project.name.toLowerCase() !== 'general tasks' ? `The project is tracking a progress of <strong>${overview.progressPercentage}%</strong> based on effort-based story points.` : ''} 
                Current milestones are aligned with the target completion date of <strong>${formatDate(project.endDate)}</strong>.
              </div>
            </div>

            <div class="section">
              <h2>2. Project Overview</h2>
              <div class="grid">
                <div class="info-item">
                  <div class="label">Project Manager</div>
                  <div class="value">${project.name.toLowerCase() === 'general' ? '-' : (project.manager?.name || 'Unassigned')}</div>
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
                  <div class="value">
                    <span class="status-badge ${project.status === 'COMPLETED' ? 'status-completed' : (project.status === 'ACTIVE' ? 'status-in-progress' : '')}">
                      ${project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              ${project.description ? `
                <div class="info-item" style="border-left-color: #8b5cf6;">
                  <div class="label">Scope & Description</div>
                  <div class="value" style="font-size: 13px; font-weight: 400;">${project.description}</div>
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
                      <td style="font-weight: 500;">${p.name}</td>
                      <td>
                        <span class="status-badge ${p.status === 'COMPLETED' ? 'status-completed' : (p.status === 'IN_PROGRESS' ? 'status-in-progress' : '')}">
                          ${p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>${p.completionPercentage}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>4. Task Summary</h2>
              ${tasks && tasks.length > 0 ? `
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
                  ${tasks.map(t => `
                    <tr>
                      <td style="font-weight: 500;">${t.title}</td>
                      <td>${t.priority}</td>
                      <td>
                        <span class="status-badge ${t.status === 'COMPLETED' ? 'status-completed' : (t.status === 'IN_PROGRESS' ? 'status-in-progress' : '')}">
                          ${t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>${t.storyPoints || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : '<p style="color: #64748b; font-size: 13px; font-style: italic;">No tasks found for this project.</p>'}
            </div>

            <div class="section" style="page-break-inside: avoid;">
              <h2>5. Budget Summary</h2>
              <div class="grid">
                <div class="info-item" style="border-left-color: #f59e0b;">
                  <div class="label">Total Budget</div>
                  <div class="value">₹${project.totalBudget || '0.00'}</div>
                </div>
                <div class="info-item" style="border-left-color: #10b981;">
                  <div class="label">Budget Status</div>
                  <div class="value">On Track</div>
                </div>
              </div>
            </div>

            <div class="footer">
              Report generated by TaskFlow | &copy; 2026 TaskFlow
            </div>
          </div>
        </body>
        </html>
      `;

      const opt = {
        margin: 10,
        filename: `${project.name}-Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const element = document.createElement('div');
      element.innerHTML = html;
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to export professional report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive"
      });
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

  const { project, overview, budget, phases, overdueTasks, workloads: originalWorkloads, upcomingDeadlines } = dashboard;
  
  const workloads = project.name?.toLowerCase() === 'general' && users.length > 0
    ? users
        .filter(u => u.role !== 'ADMIN' && u.role !== 'CLIENT')
        .map(u => {
          const existing = originalWorkloads.find(w => w.user.id === u.id);
          return existing || { user: u, workloadPercentage: 0 };
        })
    : originalWorkloads;

  const workloadChartData = workloads.map((w) => ({ name: w.user.name, workload: w.workloadPercentage }));

  const overviewContent = (
    <TabsContent value="overview" className="space-y-6 mt-0">
      {/* Phases */}
      {project.name.toLowerCase() !== 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {phases.map((phase) => {
            const isComp = phase.status === 'COMPLETED';
            const isProd = phase.status === 'IN_PROGRESS';
            return (
              <Card key={phase.id} className={`border-0 relative overflow-hidden group transition-all duration-500 ${isComp ? 'bg-gradient-to-br from-[#10B981] to-[#047857]' : isProd ? 'bg-gradient-to-br from-[#0EA5E9] to-[#0369A1]' : 'bg-card border border-border shadow-sm'}`}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
                  <h4 className={`font-black text-[10px] uppercase tracking-widest Montserrat ${isComp || isProd ? 'text-white/80' : 'text-muted-foreground'}`}>{phase.name}</h4>
                  {isComp ? (
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                  ) : isProd ? (
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      <div className="text-2xl font-black text-white Montserrat">{phase.completionPercentage}%</div>
                    </div>
                  ) : (
                    <div className="p-3 bg-secondary/50 rounded-2xl">
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <Badge variant="none" className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${isComp || isProd ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground border border-border'}`}>
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
              <div className="text-4xl font-black text-white Montserrat">
                {overview.daysToLaunch !== null && overview.daysToLaunch !== undefined 
                  ? Math.abs(overview.daysToLaunch) 
                  : 'TBD'}
              </div>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest Montserrat">
                {overview.daysToLaunch !== null && overview.daysToLaunch !== undefined 
                  ? (overview.daysToLaunch < 0 ? 'Days Overdue' : 'Days Remaining')
                  : 'No Deadline'}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Description */}
      {project.description && (
        <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest Montserrat">Project Scope & Description</CardTitle>
            <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-500">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground Montserrat leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && project.name.toLowerCase() !== 'general' && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest Montserrat">Total Commitment</CardTitle>
              <div className="p-2 bg-white/5 rounded-xl"><DollarSign className="h-4 w-4 text-[#F59E0B]" /></div>
            </CardHeader>
            <CardContent className="min-w-0 pb-8">
              <div className="text-3xl lg:text-4xl font-black text-foreground Montserrat truncate">{formatCurrency(project.totalBudget)}</div>
              <p className="text-[11px] text-muted-foreground mt-2 Montserrat font-bold italic tracking-wide">Primary Project Investment</p>
              <div className="mt-6 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] w-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </div>
            </CardContent>
          </Card>
        )}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && project.name.toLowerCase() !== 'general' && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest Montserrat">Current Utilization</CardTitle>
              <div className="p-1.5 bg-white/5 rounded-lg"><Clock className="h-3.5 w-3.5 text-[#00A3FF]" /></div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-xl font-black text-foreground Montserrat truncate">{formatCurrency(budget.used)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 Montserrat font-bold italic">{budget.usedPercentage.toFixed(1)}% of total consumed</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#00A3FF] shadow-[0_0_8px_rgba(0,163,255,0.5)] transition-all duration-1000" style={{ width: `${budget.usedPercentage}%` }} />
              </div>
            </CardContent>
          </Card>
        )}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && project.name.toLowerCase() !== 'general' && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest Montserrat">NET Balance (Remaining)</CardTitle>
              <div className="p-1.5 bg-white/5 rounded-lg">
                <div className="w-3.5 h-3.5 rounded-full bg-[#48A111]/20 flex items-center justify-center"><CheckCircle className="h-3 w-3 text-[#48A111]" /></div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-xl font-black text-[#48A111] Montserrat truncate">{formatCurrency(budget.remaining)}</div>
              <p className="text-[10px] text-muted-foreground mt-1 Montserrat font-bold italic">Available for allocation</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#48A111] shadow-[0_0_8px_rgba(72,161,17,0.5)] transition-all duration-1000" style={{ width: `${Math.max(0, 100 - budget.usedPercentage)}%` }} />
              </div>
            </CardContent>
          </Card>
        )}
        {project.name.toLowerCase() !== 'general' && project.name.toLowerCase() !== 'general tasks' && (
          <Card className="bg-card border-border ring-1 ring-border shadow-2xl relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest Montserrat">Effort Completion</CardTitle>
              <div className="p-1.5 bg-white/5 rounded-lg"><Layers className="h-3.5 w-3.5 text-[#8B5CF6]" /></div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="text-xl font-black text-foreground Montserrat truncate">{overview.progressPercentage}%</div>
              <p className="text-[10px] text-muted-foreground mt-1 Montserrat font-bold italic">{overview.completedStoryPoints} of {overview.totalStoryPoints} pts done</p>
              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-all duration-1000" style={{ width: `${overview.progressPercentage}%` }} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TabsContent>
  );

  const mainContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header: project title on left, action buttons on right */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-end md:justify-between gap-3 pb-4 px-4 sm:px-6 md:px-8 pt-4 border-b border-border/40">
        <div className="flex flex-col min-w-0 flex-1">
          {!presentationMode && (
            <button
               onClick={() => navigate('/projects')}
               className="flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all mb-2 w-fit group"
            >
              <div className="bg-secondary/50 border border-border/50 p-1 sm:p-1.5 rounded-lg mr-2 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                 <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to Projects
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black Montserrat text-foreground whitespace-normal break-words leading-tight">{project.name}</h2>
            {project.endDate && project.name.toLowerCase() !== 'general' && (
              <p className="text-xs text-muted-foreground Montserrat font-medium mt-1">
                DUE: {new Date(project.endDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 mt-2 sm:mt-0">
          {!presentationMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="bg-secondary border-border text-foreground Montserrat font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm h-7 sm:h-9">
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {/* New Task Button */}
              {(user?.role === 'ADMIN' || user?.permissions?.['tasks.create'] || (user?.role === 'MEMBER' && project?.allowMemberTaskCreation)) && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground Montserrat font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm h-7 sm:h-9">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  New Task
                </Button>
              )}
              {(user?.role === 'ADMIN' || user?.permissions?.['reports.export']) && (
                <Button variant="outline" size="sm" onClick={exportProfessionalReport} className="bg-secondary border-border text-foreground Montserrat font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm h-7 sm:h-9">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Report
                </Button>
              )}
              <Button onClick={() => setPresentationMode(true)} size="sm" className="bg-[#48A111] hover:bg-[#48A111]/90 text-white Montserrat font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm h-7 sm:h-9">
                <Maximize className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Present
              </Button>
            </>
          )}
          {presentationMode && (
            <Button onClick={() => setPresentationMode(false)} className="bg-red-500 hover:bg-red-600 text-white Montserrat font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 text-[10px] sm:text-sm h-7 sm:h-9">
              Exit Presentation Mode
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: sticky list + scrollable content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 pt-4">
        <div className="px-4 sm:px-6 md:px-8">
          <TabsList className="shrink-0 bg-secondary border-border p-1 rounded-2xl flex-wrap h-auto justify-start sm:justify-center">
            <TabsTrigger value="overview" className="rounded-xl px-3 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-sm Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-xl px-3 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-sm Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tasks</TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl px-3 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-sm Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Team</TabsTrigger>
            {user?.role !== 'CLIENT' && (
              <TabsTrigger value="chat" className="rounded-xl px-3 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-sm Montserrat font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chat</TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Only this div scrolls */}
        <div ref={dashboardRef} className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-4 sm:px-6 md:px-8 pb-8">
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
                            {/* Timer button removed */}
                            <Badge variant="outline" className="whitespace-nowrap shrink-0 text-[10px] sm:text-xs px-2 py-0.5">{task.daysUntilDue} days</Badge>
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
                          <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Task</TableHead>
                          <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Overdue</TableHead>
                          <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueTasks.map(task => (
                          <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTaskClick(task)}>
                            <TableCell className="font-medium text-[10px] sm:text-xs p-2 sm:p-3 max-w-[140px] sm:max-w-none break-words leading-tight">{task.title}</TableCell>
                            <TableCell className="text-red-600 font-bold text-[10px] sm:text-xs p-2 sm:p-3 whitespace-nowrap">{task.daysOverdue} days</TableCell>
                            <TableCell className="p-2 sm:p-3 whitespace-nowrap"><Badge className={`${priorityColors[task.priority]} text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0`}>{task.priority}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Member List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-black text-gray-500 uppercase tracking-widest Montserrat">Project Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workloads.map((w) => (
                      <div key={w.user.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black Montserrat">
                            {w.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black Montserrat">{w.user.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground Montserrat">{w.user.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4 hidden sm:block">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat">Workload</p>
                            <p className="text-xs font-black Montserrat text-primary">{w.workloadPercentage}%</p>
                          </div>
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && w.user.id !== project.managerId && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => {
                                setMemberToRemove(w);
                                setShowRemoveMemberDialog(true);
                              }}
                            >
                              <UserX className="w-5 h-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Workload Chart */}
              <Card>
                <CardHeader><CardTitle className="text-sm font-black text-gray-500 uppercase tracking-widest Montserrat">Effort Balance</CardTitle></CardHeader>
                <CardContent>
                  {workloadChartData && workloadChartData.some(w => w.workload > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={workloadChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                          cursor={{ fill: 'hsl(var(--primary)/0.1)' }}
                        />
                        <Bar dataKey="workload" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <Users className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs font-bold Montserrat opacity-50">No data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
        <div className="flex-1 h-full overflow-hidden bg-background">
          {mainContent}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
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
          </div>
        </DialogContent>
      </Dialog>
      <TaskDetailsModal 
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        task={selectedTask}
        canEdit={checkCanEditTask(selectedTask)}
        onEditClick={() => {
            setShowDetailsDialog(false);
            setShowEditDialog(true);
        }}
      />
      <Dialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong>{memberToRemove?.user.name}</strong> from this project? 
              They will no longer have access to tasks or project discussions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowRemoveMemberDialog(false)} disabled={removingMember}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removingMember}>
              {removingMember ? 'Removing...' : 'Remove Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectView;
