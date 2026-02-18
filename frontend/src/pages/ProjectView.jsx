import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatDate, phaseStatusColors, priorityColors } from '@/lib/utils';
import html2canvas from 'html2canvas';

const ProjectView = () => {
  const { id } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const dashboardRef = useRef(null);

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
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${dashboard.project.name} - Dashboard</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <h1>${dashboard.project.name}</h1>
            <img src="${imgData}" alt="Dashboard" />
          </body>
        </html>
      `;

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
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

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
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Failed to load dashboard</div>
      </div>
    );
  }

  const { project, overview, budget, phases, overdueTasks, workloads, upcomingDeadlines } =
    dashboard;

  // Prepare chart data
  const workloadChartData = workloads.map((w) => ({
    name: w.user.name,
    workload: w.workloadPercentage,
  }));

  const budgetChartData = [
    { name: 'Used', value: budget.used },
    { name: 'Remaining', value: budget.remaining },
  ];

  return (
    <div
      className={presentationMode ? 'fixed inset-0 bg-white z-50 overflow-auto' : ''}
    >
      <div className={`${presentationMode ? 'p-12' : 'p-8'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className={`${presentationMode ? 'text-5xl' : 'text-3xl'} font-bold text-gray-900`}>
                {project.name}
              </h1>
              {project.description && (
                <p className={`mt-2 ${presentationMode ? 'text-xl' : 'text-sm'} text-gray-500`}>
                  {project.description}
                </p>
              )}
              {project.client && (
                <div className={`mt-2 flex items-center ${presentationMode ? 'text-lg' : 'text-sm'} text-gray-600`}>
                  <Users className="w-4 h-4 mr-2" />
                  <span className="font-medium">Client:</span>
                  <span className="ml-2">{project.client.name}</span>
                </div>
              )}
            </div>
            {!presentationMode && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button variant="outline" onClick={exportToPNG}>
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
                <Button variant="outline" onClick={exportToPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={() => setPresentationMode(true)}>
                  <Maximize className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </div>
            )}
            {presentationMode && (
              <Button onClick={() => setPresentationMode(false)}>
                Exit Presentation
              </Button>
            )}
          </div>

          <div ref={dashboardRef}>
            {/* Phase Tracker - Horizontal Layout */}
            <div className="mb-6">
              <div className="grid grid-cols-5 gap-4">
                {phases.map((phase, index) => (
                  <Card key={phase.id} className={phase.status === 'COMPLETED' ? 'bg-green-50' : phase.status === 'IN_PROGRESS' ? 'bg-blue-50' : 'bg-gray-50'}>
                    <CardContent className="p-6 text-center">
                      <h3 className={`${presentationMode ? 'text-2xl' : 'text-lg'} font-semibold text-gray-700 mb-4`}>
                        {phase.name}
                      </h3>
                      {phase.status === 'COMPLETED' ? (
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-2">
                            <CheckCircle className="w-10 h-10 text-white" />
                          </div>
                          <p className={`${presentationMode ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>Completed</p>
                        </div>
                      ) : phase.status === 'IN_PROGRESS' ? (
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full bg-white border-4 border-green-500 flex items-center justify-center mb-2">
                            <span className={`${presentationMode ? 'text-2xl' : 'text-xl'} font-bold text-green-600`}>
                              {phase.completionPercentage}%
                            </span>
                          </div>
                          <p className={`${presentationMode ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>In Progress</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center mb-2">
                            <Clock className="w-10 h-10 text-gray-400" />
                          </div>
                          <p className={`${presentationMode ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>Waiting</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {/* Projected Launch Date Card */}
                <Card className="bg-green-100">
                  <CardContent className="p-6 text-center">
                    <h3 className={`${presentationMode ? 'text-2xl' : 'text-lg'} font-semibold text-gray-700 mb-4`}>
                      Projected Launch Date
                    </h3>
                    <div className="flex flex-col items-center">
                      <Calendar className="w-12 h-12 text-green-600 mb-2" />
                      <div className={`${presentationMode ? 'text-4xl' : 'text-3xl'} font-bold text-gray-800 mb-1`}>
                        {overview.daysToLaunch || 'N/A'} Days
                      </div>
                      {project.endDate && (
                        <p className={`${presentationMode ? 'text-base' : 'text-sm'} text-gray-600`}>
                          {formatDate(project.endDate)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className={presentationMode ? 'text-3xl' : ''}>
                    Workload Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={presentationMode ? 400 : 300}>
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" style={{ fontSize: presentationMode ? '16px' : '12px' }} />
                      <YAxis style={{ fontSize: presentationMode ? '16px' : '12px' }} />
                      <Tooltip />
                      <Bar dataKey="workload" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className={presentationMode ? 'text-3xl' : ''}>
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingDeadlines.slice(0, presentationMode ? 5 : 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className={`${presentationMode ? 'text-xl' : 'text-sm'} font-medium`}>
                            {task.title}
                          </p>
                          <p className={`${presentationMode ? 'text-base' : 'text-xs'} text-gray-500`}>
                            {task.assignee?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`${presentationMode ? 'text-lg' : 'text-sm'} font-medium text-blue-600`}>
                            {task.daysUntilDue} days
                          </p>
                        </div>
                      </div>
                    ))}
                    {upcomingDeadlines.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No upcoming deadlines</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Tasks Table */}
            {overdueTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={presentationMode ? 'text-3xl' : ''}>
                    Overdue Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={presentationMode ? 'text-xl' : ''}>Days Overdue</TableHead>
                        <TableHead className={presentationMode ? 'text-xl' : ''}>Task</TableHead>
                        <TableHead className={presentationMode ? 'text-xl' : ''}>Assigned To</TableHead>
                        <TableHead className={presentationMode ? 'text-xl' : ''}>Priority</TableHead>
                        <TableHead className={presentationMode ? 'text-xl' : ''}>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className={presentationMode ? 'text-lg' : ''}>
                            <span className="font-bold text-red-600">
                              {task.daysOverdue}
                            </span>
                          </TableCell>
                          <TableCell className={presentationMode ? 'text-lg' : ''}>
                            {task.title}
                          </TableCell>
                          <TableCell className={presentationMode ? 'text-lg' : ''}>
                            {task.assignee?.name || 'Unassigned'}
                          </TableCell>
                          <TableCell className={presentationMode ? 'text-lg' : ''}>
                            <Badge className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className={presentationMode ? 'text-lg' : ''}>
                            {formatDate(task.dueDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;