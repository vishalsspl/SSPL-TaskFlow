import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
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
    CheckCircle,
    Clock,
    Calendar,
    Loader2,
    Users,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { formatDate, priorityColors } from '@/lib/utils';

const ProjectOverview = ({ projectId }) => {
    const { user } = useAuthStore();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [overduePage, setOverduePage] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    const handleUpdatePhaseStatus = async (phaseId, status) => {
        try {
            await api.put(`/projects/${projectId}/phases/${phaseId}`, { status });
            fetchDashboard();
        } catch (error) {
            console.error('Failed to update phase status:', error);
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const itemsPerPage = isMobile ? 5 : 10;

    useEffect(() => {
        if (projectId) {
            fetchDashboard();
        }
    }, [projectId]);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/dashboard/${projectId}`);
            setDashboard(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!dashboard) {
        return null; // Don't render anything if no data
    }

    const { project, overview, phases, overdueTasks, workloads, upcomingDeadlines, tasks } = dashboard;

    const totalOverduePages = Math.ceil((overdueTasks?.length || 0) / itemsPerPage);
    const currentOverduePage = Math.min(overduePage, Math.max(1, totalOverduePages));
    const paginatedOverdueTasks = overdueTasks?.slice((currentOverduePage - 1) * itemsPerPage, currentOverduePage * itemsPerPage) || [];

    const workloadChartData = workloads.map((w) => ({
        name: w.user.name,
        workload: w.workloadPercentage,
    }));

    return (
        <div className="space-y-6 mb-8">
            {/* Project Header Info */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{project.name}</h2>
                    {project.endDate && project.name.toLowerCase() !== 'general' && (
                        <div className="flex w-fit items-center text-xs sm:text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border shrink-0">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                            <span>Due: {formatDate(project.endDate)}</span>
                        </div>
                    )}
                </div>
                <div
                    className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none leading-relaxed p-3 sm:p-4 bg-muted/20 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: project.description }}
                />
                {project.client && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">Client:</span>
                        <span className="ml-2">{project.client.name}</span>
                    </div>
                )}
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2 w-full overflow-hidden">
                <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="font-semibold text-foreground truncate">Overall Project Progress (Effort-Based)</span>
                    <span className="font-bold text-primary shrink-0">{overview.progressPercentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4 overflow-hidden border">
                    <div
                        className="bg-primary h-full transition-all duration-500 ease-out"
                        style={{ width: `${overview.progressPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] sm:text-xs text-muted-foreground gap-1 sm:gap-2 mt-1">
                    <span className="truncate">{overview.completedStoryPoints} / {overview.totalStoryPoints} Story Points</span>
                    <span className="truncate">{overview.completedTasks} / {overview.totalTasks} Tasks Completed</span>
                </div>
            </div>

            {/* Phase Tracker */}
            {project.name.toLowerCase() !== 'general' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                    {phases.map((phase) => {
                        const hasTasks = tasks && tasks.some(task => task.phaseId === phase.id);
                        const isManagerOrAdmin = user?.role === 'ADMIN' || (user?.role === 'MANAGER' && project.managerId === user?.id);
                        const canEdit = isManagerOrAdmin && !hasTasks;
                        const phaseContent = (
                            <CardContent className={`p-3 sm:p-4 text-center ${canEdit ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}>
                                <h3 className="font-semibold text-[10px] sm:text-[11px] lg:text-xs tracking-tight text-foreground mb-2 leading-tight">{phase.name}</h3>
                                {phase.status === 'COMPLETED' ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-green-500 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-green-700 font-medium">Completed</p>
                                    </div>
                                ) : phase.status === 'IN_PROGRESS' ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-card border border-green-500 flex items-center justify-center">
                                            <span className="text-[10px] sm:text-sm font-bold text-green-600 leading-none">{phase.completionPercentage}%</span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-blue-700 font-medium">In Progress</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-card border border-border flex items-center justify-center">
                                            <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Waiting</p>
                                    </div>
                                )}
                            </CardContent>
                        );

                        return (
                            <Card key={phase.id} className={phase.status === 'COMPLETED' ? 'bg-green-500/10 border-green-400/50' : phase.status === 'IN_PROGRESS' ? 'bg-blue-500/10 border-blue-400/50' : 'bg-muted/50'}>
                                {canEdit ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            {phaseContent}
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleUpdatePhaseStatus(phase.id, 'WAITING')}>Waiting</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdatePhaseStatus(phase.id, 'IN_PROGRESS')}>In Progress</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdatePhaseStatus(phase.id, 'COMPLETED')}>Completed</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    phaseContent
                                )}
                            </Card>
                        );
                    })}
                    {/* Projected Launch Date Card */}
                    <Card className="bg-green-500/10 border-green-400/50 hidden md:block">
                        <CardContent className="p-2 sm:p-4 text-center">
                            <h3 className="font-semibold text-[10px] sm:text-base text-foreground mb-1 sm:mb-2">
                                Projected Launch
                            </h3>
                            <div className="flex flex-col items-center">
                                <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-green-600 dark:text-green-500 mb-0.5" />
                                <div className="text-xs sm:text-xl font-bold text-foreground">
                                    {overview.daysToLaunch || 'N/A'} Days
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Extra Data Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mt-2 sm:mt-6">
                {/* Workload Distribution */}
                <Card className="w-full overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Workload Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {workloadChartData && workloadChartData.some(w => w.workload > 0) ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={workloadChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                                    <YAxis style={{ fontSize: '10px' }} />
                                    <Tooltip />
                                    <Bar dataKey="workload" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-accent/20">
                                <Users className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">No workload data available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                {(user?.activeFeatures?.tasks ?? user?.organization?.activeFeatures?.tasks) !== false && (
                    <Card className="w-full overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {upcomingDeadlines.slice(0, 3).map((task) => (
                                    <div key={task.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                        <div className="truncate mr-2">
                                            <p className="font-medium truncate">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">{task.assignees?.map(a => a.user?.name).join(', ') || 'Unassigned'}</p>
                                        </div>
                                        <div className="whitespace-nowrap">
                                            <span className="text-blue-600 font-medium">{task.daysUntilDue} days</span>
                                        </div>
                                    </div>
                                ))}
                                {upcomingDeadlines.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4 text-sm">No upcoming deadlines</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Overdue Tasks Table */}
            {(user?.activeFeatures?.tasks ?? user?.organization?.activeFeatures?.tasks) !== false && overdueTasks.length > 0 && (
                <Card className="mt-2 sm:mt-6 w-full overflow-hidden block">
                    <CardHeader className="pb-1 sm:pb-2 pt-3 sm:pt-6">
                        <CardTitle className="text-sm sm:text-lg text-red-600">Overdue Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-2 sm:p-6 pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Task</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Assignee</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Priority</TableHead>
                                    <TableHead className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap">Overdue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOverdueTasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium text-[10px] sm:text-xs p-2 sm:p-3 max-w-[140px] sm:max-w-none break-words leading-tight">{task.title}</TableCell>
                                        <TableCell className="text-[10px] sm:text-xs p-2 sm:p-3 whitespace-nowrap">{task.assignees?.map(a => a.user?.name).join(', ') || 'Unassigned'}</TableCell>
                                        <TableCell className="p-2 sm:p-3 whitespace-nowrap">
                                            <Badge className={`${priorityColors[task.priority]} text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0`}>
                                                {task.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-red-600 font-bold text-[10px] sm:text-xs p-2 sm:p-3 whitespace-nowrap">
                                            {task.daysOverdue} days
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {totalOverduePages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {currentOverduePage} of {totalOverduePages}
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOverduePage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentOverduePage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Prev
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOverduePage((prev) => Math.min(prev + 1, totalOverduePages))}
                                        disabled={currentOverduePage === totalOverduePages || totalOverduePages === 0}
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ProjectOverview;