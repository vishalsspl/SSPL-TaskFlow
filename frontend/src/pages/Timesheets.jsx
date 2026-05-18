import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    CheckCircle2,
    XCircle,
    Timer,
    AlertCircle,
    Save,
    Trash2,
    Check,
    X,
    User as UserIcon
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import DeleteConfirmDialog from '@/components/ui/delete-confirm-dialog';
import { Switch } from '@/components/ui/switch';

const Timesheets = () => {
    const { user } = useAuthStore();
    const { setHeader } = useHeaderStore();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [entries, setEntries] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // New entry state
    const [newEntry, setNewEntry] = useState({
        projectId: '',
        taskId: '',
        hours: '',
        description: '',
        date: new Date(),
        billable: false
    });

    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekDays = useMemo(() => [...Array(7)].map((_, i) => addDays(weekStart, i)), [weekStart]);

    const fetchEntries = useCallback(async () => {
        try {
            const startDate = format(weekStart, 'yyyy-MM-dd');
            const endDate = format(weekDays[6], 'yyyy-MM-dd');
            const response = await api.get(`/timesheets?startDate=${startDate}&endDate=${endDate}`);
            setEntries(response.data.entries || response.data);
            setAttendanceSummary(response.data.attendanceSummary || []);
        } catch (error) {
            console.error('Failed to fetch entries:', error);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    const fetchProjects = useCallback(async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    }, []);

    const fetchTasks = useCallback(async (projectId) => {
        if (!projectId) return;
        try {
            const params = { projectId };
            if (user?.role === 'MEMBER') {
                params.assignedTo = user.id;
            }
            const response = await api.get('/tasks', { params });
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    }, [user?.id, user?.role]);

    useEffect(() => {
        setHeader("Timesheets", "Log and track your project hours");
        fetchEntries();
        fetchProjects();
    }, [setHeader, fetchEntries, fetchProjects]);

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleLogHours = async () => {
        if (!newEntry.projectId || !newEntry.hours || !newEntry.date) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please fill in all required fields."
            });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/timesheets', {
                ...newEntry,
                date: format(newEntry.date, 'yyyy-MM-dd')
            });
            toast({
                title: "Success",
                description: "Hours logged successfully."
            });
            setIsLogDialogOpen(false);
            setNewEntry({
                projectId: '',
                taskId: '',
                hours: '',
                description: '',
                date: new Date(),
                billable: false
            });
            fetchEntries();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.error || "Failed to log hours."
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/timesheets/${id}/status`, { status });
            toast({
                title: "Success",
                description: `Entry ${status.toLowerCase()} successfully.`
            });
            fetchEntries();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update entry status."
            });
        }
    };

    const handleDeleteEntry = async (id) => {
        setEntryToDelete(id);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!entryToDelete) return;
        try {
            await api.delete(`/timesheets/${id}`);
            toast({
                title: "Success",
                description: "Entry deleted successfully."
            });
            fetchEntries();
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete entry."
            });
        } finally {
            setShowDeleteDialog(false);
            setEntryToDelete(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold uppercase text-[10px] tracking-wider">Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="font-bold uppercase text-[10px] tracking-wider">Rejected</Badge>;
            default: return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-bold uppercase text-[10px] tracking-wider">Pending</Badge>;
        }
    };

    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <div className="flex-1 space-y-4 p-0 sm:p-2 overflow-y-auto h-full">
            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <Button onClick={() => setIsLogDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    <Plus className="mr-2 h-4 w-4" /> Log Hours
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevWeek} className="rounded-lg h-9 w-9">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={handleToday} className="rounded-lg h-9 font-bold px-4">
                        Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextWeek} className="rounded-lg h-9 w-9">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h2 className="ml-1 sm:ml-2 font-black Montserrat text-sm sm:text-lg text-foreground whitespace-nowrap">
                        {format(weekStart, 'MMM d')} – {format(weekDays[6], 'MMM d')}
                        <span className="hidden sm:inline">, {format(weekDays[6], 'yyyy')}</span>
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-3">
                {weekDays.map((day) => {
                    const dayEntries = entries.filter(e => isSameDay(parseISO(e.date), day));
                    // Calculate hours from attendance summary if available, otherwise fallback to task logs
                    const dayAttendance = attendanceSummary.filter(a => isSameDay(parseISO(a.date), day));
                    const totalHours = dayAttendance.length > 0 
                        ? dayAttendance.reduce((sum, a) => sum + (a.hours || 0), 0)
                        : dayEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
                    
                    const isToday = isSameDay(day, new Date());

                    return (
                        <Card key={day.toString()} className={`border-none shadow-md overflow-hidden transition-all duration-300 ${isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}>
                            <CardHeader className="p-1 sm:p-3 text-center border-b border-border bg-muted/30">
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(day, 'EEE')}</p>
                                <div className={`mt-1 h-6 w-6 sm:h-8 sm:w-8 mx-auto rounded-full flex items-center justify-center font-black text-[10px] sm:text-sm ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>
                                    {format(day, 'd')}
                                </div>
                            </CardHeader>
                            <CardContent className="p-1 sm:p-3">
                                <div className="flex flex-col items-center justify-center py-1 sm:py-2">
                                    <span className={`text-sm sm:text-xl font-black Montserrat ${totalHours > 0 ? 'text-primary' : 'text-muted-foreground opacity-30'}`}>
                                        {totalHours.toFixed(1)}
                                    </span>
                                    <span className="hidden sm:block text-[10px] font-bold text-muted-foreground uppercase">Hours</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Tabs defaultValue="my-entries" className="w-full">
                <TabsList className="bg-card border border-border p-1 gap-2 rounded-xl mb-4">
                    <TabsTrigger value="my-entries" className="rounded-lg font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        My Logs
                    </TabsTrigger>
                    {isManagerOrAdmin && (
                        <TabsTrigger value="to-approve" className="rounded-lg font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                            To Approve
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="my-entries" className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">Weekly Details</CardTitle>
                            <CardDescription className="text-xs font-medium">Detailed breakdown of your logged time for this week</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {entries.filter(e => e.userId === user?.id).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <Clock className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No hours logged for this week.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => e.userId === user?.id)
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((entry) => (
                                                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                                                            <span className="font-black text-primary text-xs">{format(parseISO(entry.date), 'dd')}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm truncate Montserrat">{entry.project.name}</h4>
                                                            <p className="text-[11px] text-muted-foreground font-medium line-clamp-1 italic">
                                                                {entry.task?.title ? `${entry.task.title} — ` : ''}{entry.description || 'No description provided'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right sr-only sm:not-sr-only">
                                                            <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(parseISO(entry.date), 'MMM d, EEE')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(entry.status)}
                                                            {entry.status === 'PENDING' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg group-hover:opacity-100 opacity-0 transition-all"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="to-approve" className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">Pending Approvals</CardTitle>
                            <CardDescription className="text-xs font-medium">Review and approve time logs from your team</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {entries.filter(e => e.userId !== user?.id && e.status === 'PENDING').length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <CheckCircle2 className="h-12 w-12 mb-4 text-green-500/50" />
                                        <p className="font-bold text-muted-foreground Montserrat">All caught up! No pending approvals.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => e.userId !== user?.id && e.status === 'PENDING')
                                            .map((entry) => (
                                                <div key={entry.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                        <Avatar className="h-9 w-9 border shrink-0">
                                                            <AvatarImage src={entry.user.avatar} />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                {entry.user.name.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm Montserrat">{entry.user.name}</h4>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">
                                                                {entry.project.name} &bull; {format(parseISO(entry.date), 'MMM d, yyyy')}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{entry.description || 'No description'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                                        <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-lg font-bold text-[11px]"
                                                                onClick={() => handleStatusUpdate(entry.id, 'REJECTED')}
                                                            >
                                                                <X className="h-3 w-3 mr-1" /> Reject
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 bg-green-500 hover:bg-green-600 text-white transition-all rounded-lg font-bold text-[11px]"
                                                                onClick={() => handleStatusUpdate(entry.id, 'APPROVED')}
                                                            >
                                                                <Check className="h-3 w-3 mr-1" /> Approve
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogContent className="bg-card border-border shadow-2xl rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black Montserrat">Log Project Hours</DialogTitle>
                        <DialogDescription className="font-medium text-xs">Fill in the details below to record your work time.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log Date</Label>
                                <DatePicker
                                    date={newEntry.date}
                                    setDate={(date) => setNewEntry({ ...newEntry, date: date })}
                                    placeholder="Select date"
                                    className="bg-muted/30 border-border rounded-xl font-bold h-11"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hours Worked</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="0.0"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={newEntry.hours}
                                        onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                                        className="bg-muted/30 border-border rounded-xl font-black h-11 pl-4 pr-10"
                                    />
                                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Project</Label>
                            <SearchableSelect
                                value={newEntry.projectId}
                                onChange={(val) => {
                                    setNewEntry({ ...newEntry, projectId: val, taskId: '' });
                                    fetchTasks(val);
                                }}
                                options={projects.map(p => ({ label: p.name, value: p.id }))}
                                placeholder="Which project did you work on?"
                                className="bg-muted/30 border-border h-11 rounded-xl font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Task (Optional)</Label>
                            <SearchableSelect
                                value={newEntry.taskId}
                                onChange={(val) => setNewEntry({ ...newEntry, taskId: val })}
                                disabled={!newEntry.projectId}
                                options={tasks.map(t => ({ label: t.title, value: t.id }))}
                                placeholder="Link to a specific task"
                                className="bg-muted/30 border-border h-11 rounded-xl font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input
                                placeholder="Briefly describe what you worked on..."
                                value={newEntry.description}
                                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                className="bg-muted/30 border-border rounded-xl font-medium h-11 pb-2"
                            />
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                            <Switch 
                                id="billable-toggle" 
                                checked={newEntry.billable}
                                onCheckedChange={(checked) => setNewEntry({ ...newEntry, billable: checked })}
                            />
                            <div className="space-y-0.5 cursor-pointer" onClick={() => setNewEntry({ ...newEntry, billable: !newEntry.billable })}>
                                <Label htmlFor="billable-toggle" className="text-sm font-bold cursor-pointer">Billable Time</Label>
                                <p className="text-[10px] text-muted-foreground">Is this work chargeable to a client?</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsLogDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button
                            onClick={handleLogHours}
                            className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl px-8"
                            disabled={submitting}
                        >
                            {submitting ? "Saving..." : "Log Hours"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog 
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={confirmDelete}
                title="Delete Timesheet Entry"
                description="Are you sure you want to delete this timesheet entry? This action will remove the logged hours from the project."
            />
        </div>
    );
};

export default Timesheets;