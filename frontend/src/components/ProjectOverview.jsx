import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { formatDate, priorityColors } from '@/lib/utils';

const ProjectOverview = ({ projectId }) => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const { project, overview, phases, overdueTasks, workloads, upcomingDeadlines } = dashboard;

    const workloadChartData = workloads.map((w) => ({
        name: w.user.name,
        workload: w.workloadPercentage,
    }));

    return (
        <div className="space-y-6 mb-8">
            {/* Project Header Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
                    <p className="text-muted-foreground">{project.description}</p>
                    {project.client && (
                        <div className="mt-1 flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="font-medium">Client:</span>
                            <span className="ml-2">{project.client.name}</span>
                        </div>
                    )}
                </div>
                {project.endDate && (
                    <div className="flex items-center text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Due: {formatDate(project.endDate)}</span>
                    </div>
                )}
            </div>

            {/* Phase Tracker */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {phases.map((phase) => (
                    <Card key={phase.id} className={phase.status === 'COMPLETED' ? 'bg-green-500/10 border-green-400/50' : phase.status === 'IN_PROGRESS' ? 'bg-blue-500/10 border-blue-400/50' : 'bg-muted/50'}>
                        <CardContent className="p-4 text-center">
                            <h3 className="font-semibold text-foreground mb-2">{phase.name}</h3>
                            {phase.status === 'COMPLETED' ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-1">
                                        <CheckCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="text-xs text-green-700 font-medium">Completed</p>
                                </div>
                            ) : phase.status === 'IN_PROGRESS' ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-card border-2 border-green-500 flex items-center justify-center mb-1">
                                        <span className="text-sm font-bold text-green-600">{phase.completionPercentage}%</span>
                                    </div>
                                    <p className="text-xs text-blue-700 font-medium">In Progress</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center mb-1">
                                        <Clock className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium">Waiting</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {/* Projected Launch Date Card */}
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                        <h3 className="font-semibold text-foreground mb-2">
                            Projected Launch
                        </h3>
                        <div className="flex flex-col items-center">
                            <Calendar className="w-8 h-8 text-green-600 mb-1" />
                            <div className="text-xl font-bold text-foreground">
                                {overview.daysToLaunch || 'N/A'} Days
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workload Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Workload Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={workloadChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                                <YAxis style={{ fontSize: '10px' }} />
                                <Tooltip />
                                <Bar dataKey="workload" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Upcoming Deadlines */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {upcomingDeadlines.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                    <div className="truncate mr-2">
                                        <p className="font-medium truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground">{task.assignee?.name || 'Unassigned'}</p>
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
            </div>

            {/* Overdue Tasks Table */}
            {overdueTasks.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-red-600">Overdue Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Overdue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {overdueTasks.slice(0, 5).map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.assignee?.name || 'Unassigned'}</TableCell>
                                        <TableCell>
                                            <Badge className={priorityColors[task.priority]}>
                                                {task.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-red-600 font-bold">
                                            {task.daysOverdue} days
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ProjectOverview;
