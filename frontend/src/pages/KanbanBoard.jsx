import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Clock,
    Calendar,
    Loader2,
} from 'lucide-react';

const KanbanBoard = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [projectData, setProjectData] = useState({
        stages: [],
        launchDate: '',
        daysUntilLaunch: 0,
    });
    const [budgetData, setBudgetData] = useState({
        totalBudget: 0,
        budgetUsed: 0,
        targetBudget: 0,
        remaining: 0,
        overTargetPercentage: 0,
    });
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [workloadData, setWorkloadData] = useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            fetchKanbanData();
        }
    }, [selectedProjectId]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            const projectsList = response.data;
            setProjects(projectsList);

            // Check if we have a project ID passed from navigation
            const stateProjectId = location.state?.projectId;

            if (stateProjectId) {
                const projectExists = projectsList.find(p => p.id === stateProjectId);
                if (projectExists) {
                    setSelectedProjectId(stateProjectId);
                    return;
                }
            }

            // Auto-select first active project or first project if no state ID
            if (!selectedProjectId) {
                const activeProject = projectsList.find(p => p.status === 'ACTIVE') || projectsList[0];
                if (activeProject) {
                    setSelectedProjectId(activeProject.id);
                } else {
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setLoading(false);
        }
    };

    const fetchKanbanData = async () => {
        try {
            setLoading(true);

            // Fetch the selected project with its details
            const projectResponse = await api.get(`/projects/${selectedProjectId}`);
            const selectedProject = projectResponse.data;

            // Fetch users for workload
            const usersResponse = await api.get('/users');
            const users = usersResponse.data;

            // Calculate project stages from phases
            const phases = selectedProject.phases || [];
            const stages = [
                {
                    name: 'Planning',
                    status: getPhaseStatus(phases.find(p => p.name === 'Planning')),
                    progress: phases.find(p => p.name === 'Planning')?.completionPercentage || 0,
                },
                {
                    name: 'Design',
                    status: getPhaseStatus(phases.find(p => p.name === 'Design')),
                    progress: phases.find(p => p.name === 'Design')?.completionPercentage || 0,
                },
                {
                    name: 'Development',
                    status: getPhaseStatus(phases.find(p => p.name === 'Development')),
                    progress: phases.find(p => p.name === 'Development')?.completionPercentage || 0,
                },
                {
                    name: 'Testing',
                    status: getPhaseStatus(phases.find(p => p.name === 'Testing')),
                    progress: phases.find(p => p.name === 'Testing')?.completionPercentage || 0,
                },
            ];

            // Calculate days until launch
            const endDate = selectedProject.endDate ? new Date(selectedProject.endDate) : null;
            const today = new Date();
            const daysUntilLaunch = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0;
            const launchDate = endDate ? endDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Not set';

            setProjectData({ stages, launchDate, daysUntilLaunch });

            // Calculate budget data
            const totalBudget = Number(selectedProject.totalBudget) || 0;
            const budgetUsed = Number(selectedProject.usedBudget) || 0;
            const targetBudget = totalBudget * 0.8; // 80% target
            const remaining = totalBudget - budgetUsed;
            const overTargetPercentage = targetBudget > 0 ? ((budgetUsed - targetBudget) / targetBudget * 100).toFixed(1) : 0;

            setBudgetData({
                totalBudget,
                budgetUsed,
                targetBudget,
                remaining,
                overTargetPercentage: Math.max(0, overTargetPercentage),
            });

            // Process tasks from selected project only
            const projectTasks = selectedProject.tasks || [];

            // Calculate overdue tasks
            const overdue = projectTasks
                .filter(task => {
                    if (!task.dueDate || task.status === 'COMPLETED') return false;
                    return new Date(task.dueDate) < today;
                })
                .map(task => {
                    const dueDate = new Date(task.dueDate);
                    const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                    return {
                        daysOverdue,
                        task: task.title,
                        deadline: dueDate.toISOString().split('T')[0],
                        employee: task.assignee?.name || 'Unassigned',
                    };
                })
                .sort((a, b) => b.daysOverdue - a.daysOverdue)
                .slice(0, 4);

            setOverdueTasks(overdue);

            // Calculate upcoming deadlines
            const upcoming = projectTasks
                .filter(task => {
                    if (!task.dueDate || task.status === 'COMPLETED') return false;
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= today && dueDate <= new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // Next 14 days
                })
                .map(task => {
                    const assignedUser = task.assignee;
                    // Calculate workload as percentage (mock calculation based on task count)
                    const userTasks = projectTasks.filter(t => t.assignee?.id === assignedUser?.id && t.status !== 'COMPLETED');
                    const workload = Math.min(100, userTasks.length * 15); // Rough estimate

                    return {
                        employee: assignedUser?.name || 'Unassigned',
                        task: task.title,
                        deadline: new Date(task.dueDate).toISOString().split('T')[0],
                        workload,
                    };
                })
                .slice(0, 4);

            setUpcomingDeadlines(upcoming);

            // Calculate workload per user (for selected project only)
            const workload = users
                .filter(u => u.role !== 'CLIENT' && u.isApproved)
                .map(user => {
                    const userTasks = projectTasks.filter(t => t.assignee?.id === user.id && t.status !== 'COMPLETED');
                    const workloadPercentage = Math.min(100, userTasks.length * 15); // Rough estimate
                    return {
                        employee: user.name,
                        workload: workloadPercentage,
                    };
                })
                .filter(w => w.workload > 0) // Only show users with tasks
                .sort((a, b) => b.workload - a.workload)
                .slice(0, 5);

            setWorkloadData(workload);

        } catch (error) {
            console.error('Failed to fetch kanban data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPhaseStatus = (phase) => {
        if (!phase) return 'waiting';
        if (phase.status === 'COMPLETED') return 'completed';
        if (phase.status === 'IN_PROGRESS') return 'in-progress';
        return 'waiting';
    };

    const getStageIcon = (status, progress) => {
        if (status === 'completed') {
            return <CheckCircle2 className="w-12 h-12 text-green-600" />;
        } else if (status === 'in-progress') {
            return (
                <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-200"
                        />
                        <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                            className="text-green-600"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                        {progress}%
                    </span>
                </div>
            );
        } else {
            return <Clock className="w-12 h-12 text-gray-400" />;
        }
    };

    const getOverdueColor = (days) => {
        if (days <= 2) return 'bg-yellow-100 text-yellow-800';
        if (days <= 10) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Project Overview</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Track project progress, budget, and team workload
                        </p>
                    </div>

                    {/* Project Selector */}
                    {projects.length > 0 && (
                        <div className="flex items-center gap-3">
                            <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
                                Select Project:
                            </label>
                            <select
                                id="project-select"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="flex h-10 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
                            >
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name} ({project.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Project Stages */}
                <div className="mb-6">
                    <div className="flex gap-4 items-start">
                        <Card className="flex-1">
                            <CardContent className="pt-6">
                                <div className="mb-4">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-500"
                                            style={{
                                                width: `${projectData.stages.reduce((sum, s) => sum + s.progress, 0) / 4}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    {projectData.stages.map((stage, index) => (
                                        <div key={index} className="text-center">
                                            <div className="mb-2 text-sm font-medium text-gray-700">
                                                {stage.name}
                                            </div>
                                            <div className="flex justify-center mb-2">
                                                {getStageIcon(stage.status, stage.progress)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {stage.status === 'completed' && 'Completed'}
                                                {stage.status === 'in-progress' && 'In Progress'}
                                                {stage.status === 'waiting' && 'Waiting'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="w-64 bg-green-50 border-green-200">
                            <CardContent className="pt-6 text-center">
                                <div className="text-sm font-medium text-green-900 mb-2">
                                    Projected Launch Date
                                </div>
                                <Calendar className="w-8 h-8 text-green-700 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-green-900 mb-1">
                                    {projectData.daysUntilLaunch > 0 ? `${projectData.daysUntilLaunch} Days` : 'Past Due'}
                                </div>
                                <div className="text-xs text-green-700">
                                    {projectData.launchDate}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Budget and Overdue Tasks Row */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Project Budget */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-8">
                                <div className="flex-1">
                                    <div className="flex items-end gap-2 mb-4" style={{ height: '200px' }}>
                                        <div className="flex-1 flex flex-col justify-end">
                                            <div
                                                className="bg-gray-800 rounded-t"
                                                style={{ height: '100%' }}
                                            />
                                            <div className="text-xs text-center mt-1 text-gray-600">
                                                Total Budget
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-end">
                                            <div
                                                className="bg-green-500 rounded-t"
                                                style={{
                                                    height: budgetData.totalBudget > 0
                                                        ? `${(budgetData.budgetUsed / budgetData.totalBudget) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                            <div className="text-xs text-center mt-1 text-gray-600">
                                                Budget Used
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-end">
                                            <div
                                                className="bg-gray-300 rounded-t"
                                                style={{
                                                    height: budgetData.totalBudget > 0
                                                        ? `${(budgetData.targetBudget / budgetData.totalBudget) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                            <div className="text-xs text-center mt-1 text-gray-600">
                                                Target
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center gap-4">
                                    <div>
                                        <div className="text-sm text-gray-600">Total Budget</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            ${budgetData.totalBudget.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-600">Remaining</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            ${budgetData.remaining.toLocaleString()}
                                        </div>
                                    </div>
                                    {budgetData.overTargetPercentage > 0 && (
                                        <div>
                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                <div className="w-3 h-3 bg-red-400 rounded-full" />
                                                Currently
                                            </div>
                                            <div className="text-xl font-bold text-red-600">
                                                {budgetData.overTargetPercentage}%
                                            </div>
                                            <div className="text-xs text-red-600">Over Target</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overdue Tasks */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overdue Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {overdueTasks.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                                        <div>Overdue</div>
                                        <div>Task</div>
                                        <div>Deadline</div>
                                        <div>Employee</div>
                                    </div>
                                    {overdueTasks.map((task, index) => (
                                        <div key={index} className="grid grid-cols-4 gap-2 text-sm items-center py-2">
                                            <div>
                                                <Badge className={getOverdueColor(task.daysOverdue)}>
                                                    {task.daysOverdue} Day{task.daysOverdue > 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <div className="text-gray-900 truncate">{task.task}</div>
                                            <div className="text-gray-600">{task.deadline}</div>
                                            <div className="text-gray-900">{task.employee}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No overdue tasks
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Workload and Upcoming Deadlines Row */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Workload */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Workload</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {workloadData.length > 0 ? (
                                <div className="flex items-end justify-around gap-4" style={{ height: '250px' }}>
                                    {workloadData.map((item, index) => (
                                        <div key={index} className="flex flex-col items-center flex-1">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                {item.workload}%
                                            </div>
                                            <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                                                <div
                                                    className="bg-green-700 rounded-t w-full transition-all duration-500"
                                                    style={{ height: `${item.workload}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">{item.employee}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No workload data available
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Deadlines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {upcomingDeadlines.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                                        <div>Employee</div>
                                        <div>Task</div>
                                        <div>Deadline</div>
                                        <div>Workload</div>
                                    </div>
                                    {upcomingDeadlines.map((item, index) => (
                                        <div key={index} className="grid grid-cols-4 gap-2 text-sm items-center py-2">
                                            <div className="text-gray-900">{item.employee}</div>
                                            <div className="text-gray-900 truncate">{item.task}</div>
                                            <div className="text-gray-600">{item.deadline}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${item.workload}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-600 w-8">{item.workload}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No upcoming deadlines
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default KanbanBoard;
