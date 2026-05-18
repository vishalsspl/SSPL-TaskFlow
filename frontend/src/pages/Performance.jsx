import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    CheckCircle2, Clock, AlertTriangle, TrendingUp, FolderKanban,
    Target, Zap, BarChart2, Users, DollarSign, User as UserIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SearchableSelect } from '@/components/ui/searchable-select';

const COLORS = ['#48A111', '#0EA5E9', '#F59E0B', '#F43F5E', '#8B5CF6'];

const StatCard = ({ icon: Icon, label, value, sub, color = '#48A111' }) => (
    <Card className="border border-border">
        <CardContent className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground mb-1 leading-tight break-words">{label}</p>
                    <p className="text-xl sm:text-3xl font-black truncate" style={{ color }}>{value}</p>
                    {sub && <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight break-words">{sub}</p>}
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0" style={{ background: `${color}20` }}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
                </div>
            </div>
        </CardContent>
    </Card>
);

const PerformanceDashboardView = ({ data, hoursTitle = "Hours by Project" }) => {
    const { summary = {}, tasksByStatus = {}, hoursByProject = [], recentTasks = [] } = data || {};
    const statusData = Object.entries(tasksByStatus || {}).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <StatCard icon={CheckCircle2} label="Completion Rate" value={`${summary.completionRate}%`} sub={`${summary.completedTasks}/${summary.totalTasks} tasks`} color="#48A111" />
                <StatCard icon={Target} label="On-Time Rate" value={`${summary.onTimeRate}%`} sub="Finished before due" color="#0EA5E9" />
                <StatCard icon={Clock} label="Total Hours" value={`${summary.totalHours}h`} sub={`${summary.billableHours}h billable`} color="#F59E0B" />
                <StatCard icon={Zap} label="Velocity" value={summary.velocity} sub="Points completed" color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <StatCard icon={BarChart2} label="In Progress" value={summary.inProgressTasks} color="#0EA5E9" />
                <StatCard icon={AlertTriangle} label="Overdue" value={summary.overdueTasks} color="#F43F5E" />
                <StatCard icon={TrendingUp} label="Story Points" value={`${summary.completedStoryPoints}/${summary.totalStoryPoints}`} sub="Completed" color="#48A111" />
                <StatCard icon={DollarSign} label="Apprv Hours" value={`${summary.approvedHours}h`} color="#10B981" />
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Hours by Project/Member */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">{hoursTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hoursByProject.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No hours logged yet</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={hoursByProject}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
                                    <Bar dataKey="hours" fill="#48A111" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Tasks by Status */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Tasks by Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <ResponsiveContainer width="50%" height={180}>
                            <PieChart>
                                <Pie data={statusData.filter(d => d.value > 0)} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 flex-1">
                            {statusData.map((s, i) => (
                                <div key={s.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                        <span className="font-bold text-muted-foreground">{s.name.replace('_', ' ')}</span>
                                    </div>
                                    <span className="font-black">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Tasks */}
            <Card className="border border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Recent Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {recentTasks.map(task => {
                                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                                const STATUS_COLORS = { TODO: '#64748B', IN_PROGRESS: '#0EA5E9', IN_REVIEW: '#F59E0B', COMPLETED: '#48A111', BLOCKED: '#F43F5E' };
                                return (
                                    <div key={task.id} className="py-3 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">{task.project?.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {isOverdue && <Badge className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20">OVERDUE</Badge>}
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLORS[task.status]}20`, color: STATUS_COLORS[task.status] }}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            {task.storyPoints > 0 && (
                                                <span className="text-xs font-black text-muted-foreground">{task.storyPoints}sp</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const MyPerformance = ({ user, projects }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState('all');

    useEffect(() => {
        fetchPerformance();
    }, [projectFilter]);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const params = {};
            if (projectFilter && projectFilter !== 'all') params.projectId = projectFilter;
            const res = await api.get(`/performance/user/${user.id}`, { params });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-16 text-muted-foreground font-bold">Loading performance data...</div>;
    if (!data) return null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
                <SearchableSelect
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={[
                        { label: 'All Projects', value: 'all' },
                        ...projects.map(p => ({ label: p.name, value: p.id || 'unknown' }))
                    ]}
                    placeholder="All Projects"
                    className="w-full sm:w-52 h-10 rounded-xl bg-background border-border/60 font-bold"
                />
            </div>
            <PerformanceDashboardView data={data} hoursTitle="Hours by Project" />
        </div>
    );
};

const ProjectPerformance = ({ projects }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projectFilter, setProjectFilter] = useState('');

    useEffect(() => {
        if (projectFilter && projectFilter !== 'all') {
            fetchPerformance();
        } else {
            setData(null);
        }
    }, [projectFilter]);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/performance/project/${projectFilter}`);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
                <SearchableSelect
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={projects.map(p => ({ label: p.name, value: p.id || 'unknown' }))}
                    placeholder="Select a project"
                    className="w-full sm:w-52 h-10 rounded-xl bg-background border-border/60 font-bold"
                />
            </div>
            
            {loading ? (
                <div className="text-center py-16 text-muted-foreground font-bold">Loading project data...</div>
            ) : !data ? (
                <div className="text-center py-16 text-muted-foreground font-bold">Please select a project to view its performance.</div>
            ) : (
                <PerformanceDashboardView data={data} hoursTitle="Hours by Member" />
            )}
        </div>
    );
};

const TeamPerformance = ({ projects }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState('all');

    useEffect(() => {
        fetchTeamPerformance();
    }, [projectFilter]);

    const fetchTeamPerformance = async () => {
        setLoading(true);
        try {
            const params = {};
            if (projectFilter && projectFilter !== 'all') params.projectId = projectFilter;
            const res = await api.get('/performance/statistics', { params });
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-16 text-muted-foreground font-bold">Loading team data...</div>;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
                <SearchableSelect
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={[
                        { label: 'All Projects', value: 'all' },
                        ...projects.map(p => ({ label: p.name, value: p.id || 'unknown' }))
                    ]}
                    placeholder="All Projects"
                    className="w-full sm:w-52 h-10 rounded-xl bg-background border-border/60 font-bold"
                />
            </div>

            <div className="grid gap-4">
                {data.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground font-bold">No team members found</div>
                ) : (
                    data.map((member) => (
                        <Card key={member.user.id} className="border border-border">
                            <CardContent className="pt-4 sm:pt-5 px-3 sm:px-6 pb-4 sm:pb-5">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-border shrink-0 mt-0.5 shadow-sm">
                                        <AvatarImage src={member.user.avatar} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-black text-xs sm:text-sm">
                                            {member.user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-2 md:gap-4">
                                            <div className="mb-2 sm:mb-0">
                                                <p className="font-black text-[13px] sm:text-sm truncate">{member.user.name}</p>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground capitalize mt-0.5">{member.user.role.toLowerCase()}</p>
                                            </div>
                                            
                                            {/* Stats Container - mobile optimized box layout */}
                                            <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-4 text-xs w-full sm:w-auto pb-1 sm:pb-0">
                                                <div className="flex flex-col items-center justify-center bg-secondary/30 sm:bg-transparent py-1.5 px-1 sm:px-2 rounded-lg min-w-0">
                                                    <p className="font-black text-[12px] sm:text-lg text-primary truncate">{member.completionRate}%</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tight truncate">Done</p>
                                                </div>
                                                <div className="flex flex-col items-center justify-center bg-secondary/30 sm:bg-transparent py-1.5 px-1 sm:px-2 rounded-lg min-w-0">
                                                    <p className="font-black text-[12px] sm:text-lg text-foreground truncate">{member.totalHours}h</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tight truncate">Hours</p>
                                                </div>
                                                <div className="flex flex-col items-center justify-center bg-secondary/30 sm:bg-transparent py-1.5 px-1 sm:px-2 rounded-lg min-w-0">
                                                    <p className="font-black text-[12px] sm:text-lg text-purple-500 truncate">{member.velocity}</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tight truncate">Velocity</p>
                                                </div>
                                                <div className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-lg min-w-0 transition-colors ${member.overdueTasks > 0 ? 'bg-red-500/10 sm:bg-transparent' : 'bg-secondary/30 sm:bg-transparent opacity-50'}`}>
                                                    <p className={`font-black text-[12px] sm:text-lg truncate ${member.overdueTasks > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{member.overdueTasks}</p>
                                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-tight truncate">Overdue</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 mt-2">
                                            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground font-medium px-1">
                                                <span>{member.completedTasks}/{member.totalTasks} tasks</span>
                                                <span className="text-foreground font-bold">{member.completionRate}%</span>
                                            </div>
                                            <Progress value={member.completionRate} className="h-1.5 sm:h-2" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

const Performance = () => {
    const { user } = useAuthStore();
    const { setHeader } = useHeaderStore();
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        setHeader('Performance', 'Track productivity, velocity, and team output');
        api.get('/projects').then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.data || [];
            setProjects(data);
        }).catch(console.error);
    }, [setHeader]);

    const canViewTeam = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden p-0 sm:p-2 pt-2 gap-4">
            {canViewTeam ? (
                <Tabs defaultValue={user?.role === 'ADMIN' ? 'project' : 'mine'} className="flex-1 flex flex-col min-h-0 w-full">
                    <div className="px-3 sm:px-6 w-full shrink-0">
                        <TabsList className="bg-secondary/40 border border-border/60 rounded-xl flex-wrap h-auto w-full sm:w-fit justify-start bg-clip-padding">
                            {user?.role !== 'ADMIN' && (
                                <TabsTrigger value="mine" className="rounded-lg font-black text-[11px] sm:text-sm px-2 sm:px-4 py-1.5 flex-1 sm:flex-none">
                                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" /> My Performance
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="team" className="rounded-lg font-black text-[11px] sm:text-sm px-2 sm:px-4 py-1.5 flex-1 sm:flex-none">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" /> Team Performance
                            </TabsTrigger>
                            <TabsTrigger value="project" className="rounded-lg font-black text-[11px] sm:text-sm px-2 sm:px-4 py-1.5 flex-1 sm:flex-none">
                                <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" /> Project Performance
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    {user?.role !== 'ADMIN' && (
                        <TabsContent value="mine" className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-3 sm:px-6 pb-8">
                            <MyPerformance user={user} projects={projects} />
                        </TabsContent>
                    )}
                    <TabsContent value="team" className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-3 sm:px-6 pb-8">
                        <TeamPerformance projects={projects} />
                    </TabsContent>
                    <TabsContent value="project" className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-3 sm:px-6 pb-8">
                        <ProjectPerformance projects={projects} />
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="overflow-y-auto overflow-x-hidden px-3 sm:px-6 pb-8">
                    <MyPerformance user={user} projects={projects} />
                </div>
            )}
        </div>
    );
};

export default Performance;