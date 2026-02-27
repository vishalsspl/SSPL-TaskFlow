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
                        employee: task.assignees?.map(a => a.user.name).join(', ') || 'Unassigned',
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
                    const assigneeIds = task.assignees?.map(a => a.user.id) || [];
                    const userTasks = projectTasks.filter(t => t.assignees?.some(a => assigneeIds.includes(a.user.id)) && t.status !== 'COMPLETED');
                    const firstAssignee = task.assignees?.[0]?.user;
                    const workload = Math.min(100, userTasks.length * 15); // Rough estimate

                    return {
                        employee: firstAssignee?.name || 'Unassigned',
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
                    const userTasks = projectTasks.filter(t => t.assignees?.some(a => a.user.id === user.id) && t.status !== 'COMPLETED');
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
        <div className="p-8 bg-[#050505] min-h-screen no-scrollbar">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] Montserrat flex items-center gap-2">
                            <Layers className="w-3 h-3 text-primary" />
                            Holistic operational overview and strategic metrics
                        </p>
                    </div>

                    {/* Project Selector */}
                    {projects.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label htmlFor="project-select" className="text-[10px] font-black text-gray-600 uppercase tracking-widest Montserrat ml-1">
                                Operational Theater
                            </label>
                            <select
                                id="project-select"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="flex h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white Montserrat focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[320px] transition-all cursor-pointer hover:bg-white/10"
                            >
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id} className="bg-[#111] text-white">
                                        {project.name} — {project.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Project Stages */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="lg:col-span-3 bg-white/[0.02] border-white/5 ring-1 ring-white/10 rounded-3xl overflow-hidden glass">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] Montserrat">Mission Phases</h3>
                                <div className="flex items-center gap-2 text-primary font-black Montserrat text-xs">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    Real-time Synchronization
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {projectData.stages.map((stage, index) => (
                                    <div key={index} className="flex flex-col items-center group">
                                        <div className="mb-4 transform group-hover:scale-110 transition-transform duration-500">
                                            {getStageIcon(stage.status, stage.progress)}
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[11px] font-black text-white Montserrat uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">
                                                {stage.name}
                                            </div>
                                            <div className={`text-[9px] font-black Montserrat uppercase tracking-tighter ${stage.status === 'completed' ? 'text-green-500' : stage.status === 'in-progress' ? 'text-primary' : 'text-gray-700'}`}>
                                                {stage.status === 'completed' ? '✓ Finalized' : stage.status === 'in-progress' ? '○ In Progress' : '• Pending'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest Montserrat">Overall Convergence</span>
                                    <span className="text-lg font-black text-white Montserrat">
                                        {Math.round(projectData.stages.reduce((sum, s) => sum + s.progress, 0) / 4)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 ring-1 ring-white/10">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-[#A3E635] rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                        style={{
                                            width: `${projectData.stages.reduce((sum, s) => sum + s.progress, 0) / 4}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-[#10B981] to-[#047857] shadow-[0_20px_50px_-10px_rgba(16,185,129,0.3)] rounded-3xl overflow-hidden relative group">
                        <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full relative z-10">
                            <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md mb-6 ring-1 ring-white/30 group-hover:rotate-12 transition-transform duration-500">
                                <Calendar className="w-10 h-10 text-white" />
                            </div>
                            <div className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] Montserrat mb-1">
                                Strategic Launch
                            </div>
                            <div className="text-5xl font-black text-white Montserrat mb-2 tracking-tighter">
                                {projectData.daysUntilLaunch > 0 ? projectData.daysUntilLaunch : '0'}
                            </div>
                            <div className="text-[10px] font-black text-white/50 uppercase tracking-widest Montserrat mb-6">
                                Days to Deployment
                            </div>
                            <div className="w-full py-3 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <span className="text-white font-black Montserrat text-[11px]">{projectData.launchDate}</span>
                            </div>
                        </CardContent>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                    </Card>
                </div>

                {/* Budget and Overdue Tasks Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Project Budget */}
                    <Card className="bg-white/[0.02] border-white/5 ring-1 ring-white/10 rounded-3xl glass">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] Montserrat">Financial Vector</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row gap-10">
                                <div className="flex-1">
                                    <div className="flex items-end gap-4 mb-4" style={{ height: '220px' }}>
                                        <div className="flex-1 flex flex-col justify-end group">
                                            <div className="relative mb-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="absolute bottom-full mb-2 px-2 py-1 bg-white text-black text-[9px] font-black rounded Montserrat whitespace-nowrap">
                                                    ${budgetData.totalBudget.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="bg-white/10 rounded-2xl w-full h-[100%] ring-1 ring-white/10 group-hover:bg-white/20 transition-all" />
                                            <div className="text-[9px] font-black text-gray-600 text-center mt-3 Montserrat uppercase tracking-widest">Total</div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-end group">
                                            <div className="relative mb-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="absolute bottom-full mb-2 px-2 py-1 bg-[#00A3FF] text-white text-[9px] font-black rounded Montserrat whitespace-nowrap">
                                                    ${budgetData.budgetUsed.toLocaleString()}
                                                </span>
                                            </div>
                                            <div
                                                className="bg-[#00A3FF] rounded-2xl w-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,163,255,0.4)]"
                                                style={{
                                                    height: budgetData.totalBudget > 0
                                                        ? `${(budgetData.budgetUsed / budgetData.totalBudget) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                            <div className="text-[9px] font-black text-[#00A3FF] text-center mt-3 Montserrat uppercase tracking-widest">Utilized</div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-end group">
                                            <div className="relative mb-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="absolute bottom-full mb-2 px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded Montserrat whitespace-nowrap">
                                                    ${budgetData.targetBudget.toLocaleString()}
                                                </span>
                                            </div>
                                            <div
                                                className="bg-amber-500/20 border border-amber-500/30 rounded-2xl w-full transition-all"
                                                style={{
                                                    height: budgetData.totalBudget > 0
                                                        ? `${(budgetData.targetBudget / budgetData.totalBudget) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                            <div className="text-[9px] font-black text-amber-500 text-center mt-3 Montserrat uppercase tracking-widest">Threshold</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center gap-8 min-w-[180px]">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest Montserrat">Total committed</div>
                                        <div className="text-3xl font-black text-white Montserrat tracking-tighter">
                                            ${budgetData.totalBudget.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest Montserrat">Remaining bandwidth</div>
                                        <div className="text-3xl font-black text-primary Montserrat tracking-tighter">
                                            ${budgetData.remaining.toLocaleString()}
                                        </div>
                                    </div>
                                    {budgetData.overTargetPercentage > 0 && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                            <div className="text-[9px] font-black text-red-500 uppercase tracking-widest Montserrat mb-1 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                                Alert: Over Threshold
                                            </div>
                                            <div className="text-2xl font-black text-red-500 Montserrat">
                                                {budgetData.overTargetPercentage}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overdue Tasks */}
                    <Card className="bg-white/[0.02] border-white/5 ring-1 ring-white/10 rounded-3xl glass">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] Montserrat">Overdue Intelligence</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {overdueTasks.length > 0 ? (
                                <div className="space-y-3 mt-4">
                                    <div className="grid grid-cols-4 gap-4 text-[9px] font-black text-gray-700 uppercase tracking-widest Montserrat pb-3 border-b border-white/5">
                                        <div>Staleness</div>
                                        <div>Task Directive</div>
                                        <div>Target Date</div>
                                        <div>Lead</div>
                                    </div>
                                    {overdueTasks.map((task, index) => (
                                        <div key={index} className="grid grid-cols-4 gap-4 text-xs items-center py-3 border-b border-white/5 last:border-0 group cursor-default">
                                            <div>
                                                <Badge className={`bg-red-500/10 text-red-500 border-0 px-2 py-0.5 rounded-sm text-[9px] font-black shadow-[0_0_10px_rgba(239,68,68,0.2)]`}>
                                                    {task.daysOverdue}D DELAY
                                                </Badge>
                                            </div>
                                            <div className="text-white font-bold Montserrat group-hover:text-red-400 transition-colors truncate">{task.task}</div>
                                            <div className="text-gray-600 Montserrat font-bold text-[10px]">{task.deadline}</div>
                                            <div className="text-white font-black Montserrat text-[10px]">{task.employee}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest Montserrat">Zero delinquent tasks</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Workload and Upcoming Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
                    {/* Workload */}
                    <Card className="bg-white/[0.02] border-white/5 ring-1 ring-white/10 rounded-3xl glass">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] Montserrat">Team Workload Velocity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            {workloadData.length > 0 ? (
                                <div className="flex items-end justify-around gap-6" style={{ height: '240px' }}>
                                    {workloadData.map((item, index) => (
                                        <div key={index} className="flex flex-col items-center flex-1 group">
                                            <div className="text-[10px] font-black text-primary mb-3 Montserrat opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                {item.workload}%
                                            </div>
                                            <div className="w-full flex flex-col justify-end" style={{ height: '180px' }}>
                                                <div
                                                    className="bg-gradient-to-t from-primary/20 to-primary rounded-2xl w-full transition-all duration-1000 group-hover:scale-105 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                                                    style={{ height: `${item.workload}%` }}
                                                />
                                            </div>
                                            <div className="text-[9px] font-black text-gray-500 mt-4 text-center Montserrat truncate w-full uppercase tracking-tighter">
                                                {item.employee.split(' ')[0]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-600 text-[10px] font-black Montserrat uppercase tracking-widest">No active telemetry</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card className="bg-white/[0.02] border-white/5 ring-1 ring-white/10 rounded-3xl glass">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] Montserrat">Next 14 Days Forecast</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {upcomingDeadlines.length > 0 ? (
                                <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-4 gap-4 text-[9px] font-black text-gray-700 uppercase tracking-widest Montserrat pb-3 border-b border-white/5">
                                        <div>Lead</div>
                                        <div>Task</div>
                                        <div>Deadline</div>
                                        <div>Complexity</div>
                                    </div>
                                    {upcomingDeadlines.map((item, index) => (
                                        <div key={index} className="grid grid-cols-4 gap-4 text-xs items-center py-3 border-b border-white/5 last:border-0 group cursor-default">
                                            <div className="text-white font-black Montserrat text-[10px]">{item.employee}</div>
                                            <div className="text-white font-bold Montserrat group-hover:text-primary transition-colors truncate">{item.task}</div>
                                            <div className="text-gray-500 Montserrat font-bold text-[10px]">{item.deadline}</div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                                                        style={{ width: `${item.workload}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] font-black text-primary Montserrat w-6">{item.workload}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-600 text-[10px] font-black Montserrat uppercase tracking-widest">Horizon is clear</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default KanbanBoard;
