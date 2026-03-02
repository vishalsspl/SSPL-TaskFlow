import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    AlertCircle,
    BarChart3,
    Target,
    AlertTriangle,
    Layout,
    Briefcase,
    ShieldCheck,
    User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StatsGrid = ({ stats, statusColors }) => (
    <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3" /> Completion
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold">{stats.completionRate}%</div>
                    <Progress value={stats.completionRate} className="h-1.5 mt-2" />
                </CardContent>
            </Card>
            <Card className="bg-orange-500/5 border-orange-500/20">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-orange-500" /> Overdue
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                    <div className="text-2xl font-bold text-orange-500">{stats.overdueCount}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Pending past deadline</p>
                </CardContent>
            </Card>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
                <Layout className="w-4 h-4" /> Status Breakdown
            </h3>
            <div className="space-y-2.5">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                    <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center gap-1.5 capitalize">
                                <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-slate-400'}`} />
                                {status.replace('_', ' ')}
                            </span>
                            <span className="font-semibold">{count}</span>
                        </div>
                        <Progress
                            value={stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0}
                            className={`h-1.5 ${status === 'COMPLETED' ? 'bg-green-100' : 'bg-slate-100'}`}
                            indicatorClassName={statusColors[status]}
                        />
                    </div>
                ))}
            </div>
        </div>

        {/* Story Points */}
        <div className="p-4 rounded-xl bg-muted/30 border border-muted flex items-center justify-between">
            <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Story Points Delivered</p>
                <p className="text-xl font-bold">{stats.completedStoryPoints} / {stats.totalStoryPoints}</p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center text-[10px] font-bold">
                {stats.totalStoryPoints > 0 ? Math.round((stats.completedStoryPoints / stats.totalStoryPoints) * 100) : 0}%
            </div>
        </div>
    </div>
);

const MemberProgress = ({ userId, open, onOpenChange }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('individual');

    useEffect(() => {
        if (open && userId) {
            fetchProgress();
        }
    }, [open, userId]);

    const fetchProgress = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/users/${userId}/progress`);
            setData(response.data);
            // Default to management if they are a manager and have management data
            if (response.data.management) {
                setActiveTab('management');
            } else {
                setActiveTab('individual');
            }
        } catch (err) {
            console.error('Failed to fetch progress:', err);
            setError('Failed to load progress data');
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        TODO: 'bg-slate-500',
        IN_PROGRESS: 'bg-blue-500',
        IN_REVIEW: 'bg-purple-500',
        COMPLETED: 'bg-green-500',
        BLOCKED: 'bg-red-500',
    };

    if (!open) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="pb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        {data?.user?.role === 'MANAGER' ? 'Manager Dashboard' : 'Project Progress'}: {data?.user?.name || 'Member'}
                    </SheetTitle>
                    <SheetDescription>
                        {data?.user?.role === 'MANAGER'
                            ? "Overview of managed projects and team performance."
                            : "Detailed performance breakdown and individual task metrics."}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground animate-pulse">Calculating analytics...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                        <p className="text-lg font-medium">{error}</p>
                        <button
                            onClick={fetchProgress}
                            className="mt-4 text-primary hover:underline text-sm font-medium"
                        >
                            Try again
                        </button>
                    </div>
                ) : data ? (
                    <div className="space-y-6 pb-8">
                        {data.management ? (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="management" className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> Management
                                    </TabsTrigger>
                                    <TabsTrigger value="individual" className="flex items-center gap-2">
                                        <User className="w-4 h-4" /> Personal
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="management" className="space-y-6">
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">Projects Managed</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-primary/20 text-primary border-none">
                                            {data.management.projectCount}
                                        </Badge>
                                    </div>
                                    <StatsGrid stats={data.management} statusColors={statusColors} />
                                </TabsContent>

                                <TabsContent value="individual" className="space-y-6">
                                    <StatsGrid stats={data.individual} statusColors={statusColors} />

                                    {/* Personal Participation Breakdown */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" /> Personal Participation
                                        </h3>
                                        <div className="grid gap-2">
                                            {data.individual.projectBreakdown.map((project) => (
                                                <div key={project.projectId} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-medium text-sm">{project.projectName}</p>
                                                            <p className="text-[10px] text-muted-foreground">{project.total} tasks assigned</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {Math.round((project.completed / project.total) * 100)}% done
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted">
                                                        <div className="bg-green-500" style={{ width: `${(project.completed / project.total) * 100}%` }} />
                                                        <div className="bg-blue-500" style={{ width: `${(project.inProgress / project.total) * 100}%` }} />
                                                        <div className="bg-slate-300" style={{ width: `${(project.todo / project.total) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <>
                                <StatsGrid stats={data.individual} statusColors={statusColors} />
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Participation by Project
                                    </h3>
                                    <div className="grid gap-2">
                                        {data.individual.projectBreakdown.map((project) => (
                                            <div key={project.projectId} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium text-sm">{project.projectName}</p>
                                                        <p className="text-[10px] text-muted-foreground">{project.total} tasks assigned</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {Math.round((project.completed / project.total) * 100)}% done
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted">
                                                    <div className="bg-green-500" style={{ width: `${(project.completed / project.total) * 100}%` }} />
                                                    <div className="bg-blue-500" style={{ width: `${(project.inProgress / project.total) * 100}%` }} />
                                                    <div className="bg-slate-300" style={{ width: `${(project.todo / project.total) * 100}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
};

export default MemberProgress;
