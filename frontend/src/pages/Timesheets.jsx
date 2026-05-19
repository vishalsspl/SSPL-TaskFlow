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
    Edit2,
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
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedDateFilter, setSelectedDateFilter] = useState(new Date());

    // New entry state
    const [newEntry, setNewEntry] = useState({
        projectId: '',
        taskId: '',
        quarters: [],
        description: '',
        date: new Date(),
        billable: false
    });

    const weekDays = useMemo(() => [...Array(7)].map((_, i) => addDays(currentDate, -6 + i)), [currentDate]);

    const fetchEntries = useCallback(async () => {
        try {
            const startDate = format(weekDays[0], 'yyyy-MM-dd');
            const endDate = format(weekDays[6], 'yyyy-MM-dd');
            const response = await api.get(`/timesheets?startDate=${startDate}&endDate=${endDate}`);
            setEntries(response.data.entries || response.data);
            setAttendanceSummary(response.data.attendanceSummary || []);
        } catch (error) {
            console.error('Failed to fetch entries:', error);
        } finally {
            setLoading(false);
        }
    }, [weekDays]);

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
        if (!newEntry.projectId || (!newEntry.taskId && !editingEntryId) || !newEntry.quarters || newEntry.quarters.length === 0 || !newEntry.date) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a project, a task, and at least one work quarter."
            });
            return;
        }

        setSubmitting(true);
        try {
            const quarterMap = {
                'Q1': '1st Quarter (12AM-6AM)',
                'Q2': '2nd Quarter (6AM-12PM)',
                'Q3': '3rd Quarter (12PM-6PM)',
                'Q4': '4th Quarter (6PM-12AM)'
            };
            const quarterTexts = newEntry.quarters.map(q => quarterMap[q]).join(' & ');
            const productiveHours = newEntry.quarters.length * 4.0;

            const description = newEntry.description 
                ? `${newEntry.description} - [${quarterTexts}]`
                : `Logged for [${quarterTexts}]`;

            if (editingEntryId) {
                await api.put(`/timesheets/${editingEntryId}`, {
                    hours: productiveHours,
                    description,
                    billable: newEntry.billable
                });
                toast({
                    title: "Success",
                    description: "Hours updated successfully."
                });
            } else {
                await api.post('/timesheets', {
                    ...newEntry,
                    hours: productiveHours,
                    description,
                    date: format(newEntry.date, 'yyyy-MM-dd')
                });
                toast({
                    title: "Success",
                    description: "Hours logged successfully."
                });
            }
            
            setIsLogDialogOpen(false);
            setEditingEntryId(null);
            setNewEntry({
                projectId: '',
                taskId: '',
                quarters: [],
                description: '',
                date: new Date(),
                billable: false
            });
            fetchEntries();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.error || "Failed to save hours."
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditEntry = (entry) => {
        let extractedQuarters = [];
        let baseDescription = entry.description || '';

        if (baseDescription.includes('[') && baseDescription.includes(']')) {
            const bracketMatch = baseDescription.match(/\[(.*?)\]/);
            if (bracketMatch) {
                const text = bracketMatch[1];
                if (text.includes('1st Quarter')) extractedQuarters.push('Q1');
                if (text.includes('2nd Quarter')) extractedQuarters.push('Q2');
                if (text.includes('3rd Quarter')) extractedQuarters.push('Q3');
                if (text.includes('4th Quarter')) extractedQuarters.push('Q4');
                
                baseDescription = baseDescription.replace(` - [${text}]`, '').replace(`Logged for [${text}]`, '').trim();
            }
        }

        setEditingEntryId(entry.id);
        setNewEntry({
            projectId: entry.projectId,
            taskId: entry.taskId || '',
            quarters: extractedQuarters,
            description: baseDescription,
            date: parseISO(entry.date),
            billable: entry.billable
        });
        if (entry.projectId) fetchTasks(entry.projectId);
        setIsLogDialogOpen(true);
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
            await api.delete(`/timesheets/${entryToDelete}`);
            toast({
                title: "Success",
                description: "Entry deleted successfully."
            });
            fetchEntries();
        } catch (error) {
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

    const getUsedQuartersForDate = (dateToVerify, ignoreEntryId = null) => {
        let used = [];
        const dateEntries = entries.filter(e => 
            e.userId === user?.id && 
            isSameDay(parseISO(e.date), dateToVerify) &&
            e.id !== ignoreEntryId
        );

        dateEntries.forEach(entry => {
            const desc = entry.description || '';
            if (desc.includes('[') && desc.includes(']')) {
                const bracketMatch = desc.match(/\[(.*?)\]/);
                if (bracketMatch) {
                    const text = bracketMatch[1];
                    if (text.includes('1st Quarter')) used.push('Q1');
                    if (text.includes('2nd Quarter')) used.push('Q2');
                    if (text.includes('3rd Quarter')) used.push('Q3');
                    if (text.includes('4th Quarter')) used.push('Q4');
                }
            }
        });
        return used;
    };

    const getCleanDescription = (desc) => {
        if (!desc) return 'No description provided';
        let clean = desc;
        if (clean.includes('[') && clean.includes(']')) {
            const bracketMatch = clean.match(/\[(.*?)\]/);
            if (bracketMatch) {
                const text = bracketMatch[1];
                clean = clean.replace(` - [${text}]`, '').replace(`Logged for [${text}]`, '').trim();
            }
        }
        return clean || 'No description provided';
    };

    const getQuartersList = (desc) => {
        if (!desc) return [];
        let q = [];
        if (desc.includes('1st Quarter')) q.push('Q1');
        if (desc.includes('2nd Quarter')) q.push('Q2');
        if (desc.includes('3rd Quarter')) q.push('Q3');
        if (desc.includes('4th Quarter')) q.push('Q4');
        return q;
    };

    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    
    // Evaluate used quarters for the current form state
    const usedQuarters = getUsedQuartersForDate(newEntry.date, editingEntryId);

    return (
        <div className="flex-1 space-y-4 p-0 sm:p-2 overflow-y-auto h-full">
            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <Button 
                    onClick={() => {
                        setEditingEntryId(null);
                        setNewEntry({
                            projectId: '',
                            taskId: '',
                            quarters: [],
                            description: '',
                            date: new Date(),
                            billable: false
                        });
                        setIsLogDialogOpen(true);
                    }} 
                    disabled={!isSameDay(selectedDateFilter, new Date())}
                    className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
                        {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d')}
                        <span className="hidden sm:inline">, {format(weekDays[6], 'yyyy')}</span>
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-3">
                {weekDays.map((day) => {
                    // Only sum the task logs for the current user for the specific day
                    const myDayEntries = entries.filter(e => e.userId === user?.id && isSameDay(parseISO(e.date), day));
                    const prodHours = myDayEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
                    // For every 8.0 productive hours, there are 1.5 non-productive hours.
                    const nonProdHours = prodHours * (1.5 / 8.0);
                    const totalDayHours = prodHours + nonProdHours;
                    
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDateFilter && isSameDay(day, selectedDateFilter);

                    return (
                        <Card 
                            key={day.toString()} 
                            onClick={() => setSelectedDateFilter(day)}
                            className={`border-none shadow-md overflow-hidden transition-all duration-300 flex flex-col cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                isSelected ? 'ring-2 ring-primary bg-primary/10' : 'bg-card hover:bg-muted/30'
                            }`}
                        >
                            <CardHeader className="p-1 sm:p-2 text-center border-b border-border bg-muted/30">
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(day, 'EEE')}</p>
                                <div className={`mt-1 h-6 w-6 sm:h-7 sm:w-7 mx-auto rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs ${isToday || isSelected ? 'bg-primary text-white' : 'text-foreground'}`}>
                                    {format(day, 'd')}
                                </div>
                            </CardHeader>
                            <CardContent className="p-1 sm:p-2 flex-1 flex flex-col justify-center">
                                <div className="flex flex-col items-center justify-center">
                                    <span className={`text-sm sm:text-lg font-black Montserrat ${prodHours > 0 ? 'text-primary' : 'text-muted-foreground opacity-30'}`}>
                                        {prodHours > 0 ? totalDayHours.toFixed(1) : '0.0'}
                                    </span>
                                    {prodHours > 0 ? (
                                        <div className="flex flex-col items-center mt-1 w-full space-y-0.5">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-green-500 uppercase">Prod: {prodHours.toFixed(1)}h</span>
                                            <span className="text-[8px] sm:text-[9px] font-bold text-red-500 uppercase">Non: {nonProdHours.toFixed(1)}h</span>
                                        </div>
                                    ) : (
                                        <span className="hidden sm:block text-[9px] font-bold text-muted-foreground uppercase mt-1">Total Hrs</span>
                                    )}
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
                        <TabsTrigger value="team-logs" className="rounded-lg font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                            Team Logs
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="my-entries" className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">Daily Details - {format(selectedDateFilter, 'MMMM d, yyyy')}</CardTitle>
                            <CardDescription className="text-xs font-medium">Detailed breakdown of your logged time for the selected day</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {entries.filter(e => e.userId === user?.id && isSameDay(parseISO(e.date), selectedDateFilter)).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <Clock className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No hours logged for this day.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => e.userId === user?.id)
                                            .filter(e => selectedDateFilter ? isSameDay(parseISO(e.date), selectedDateFilter) : true)
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
                                                                {entry.task?.title ? `${entry.task.title} — ` : ''}{getCleanDescription(entry.description)}
                                                            </p>
                                                            {getQuartersList(entry.description).length > 0 && (
                                                                <div className="flex gap-1.5 mt-1.5">
                                                                    {getQuartersList(entry.description).map(q => {
                                                                        const qLabels = { 'Q1': '1st Qtr', 'Q2': '2nd Qtr', 'Q3': '3rd Qtr', 'Q4': '4th Qtr' };
                                                                        return (
                                                                            <Badge key={q} variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-primary/30 text-primary bg-primary/10 uppercase font-bold tracking-widest">
                                                                                {qLabels[q]}
                                                                            </Badge>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
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
                                                                <div className="flex items-center gap-1 transition-all">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleEditEntry(entry)}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
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

                <TabsContent value="team-logs" className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">Team Logs</CardTitle>
                            <CardDescription className="text-xs font-medium">Review, approve, or reject time logs from your team</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {entries.filter(e => e.userId !== user?.id && (!selectedDateFilter || isSameDay(parseISO(e.date), selectedDateFilter))).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No team logs found for this day.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => e.userId !== user?.id)
                                            .filter(e => selectedDateFilter ? isSameDay(parseISO(e.date), selectedDateFilter) : true)
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
                                                            <div className="text-[10px] text-muted-foreground font-bold uppercase truncate flex items-center gap-2">
                                                                <span>{entry.project.name} &bull; {format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                                                                {getQuartersList(entry.description).length > 0 && (
                                                                    <div className="flex gap-1 border-l pl-2 border-border">
                                                                        {getQuartersList(entry.description).map(q => (
                                                                            <Badge key={q} variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/30 text-primary bg-primary/5 uppercase font-bold">
                                                                                {q}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{getCleanDescription(entry.description)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(entry.status)}
                                                            <div className="flex items-center gap-1 border-l pl-3 border-border">
                                                                {entry.status === 'PENDING' && (
                                                                    <>
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'REJECTED')} title="Reject">
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'APPROVED')} title="Approve">
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {entry.status === 'APPROVED' && (
                                                                    <>
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'PENDING')} title="Reset to Pending">
                                                                            <Clock className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'REJECTED')} title="Reject">
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {entry.status === 'REJECTED' && (
                                                                    <>
                                                                        <Button size="icon" variant="outline" className="h-8 w-8 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'PENDING')} title="Reset to Pending">
                                                                            <Clock className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'APPROVED')} title="Approve">
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
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
                        <DialogTitle className="text-2xl font-black Montserrat">{editingEntryId ? 'Edit Project Hours' : 'Log Project Hours'}</DialogTitle>
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
                                    disabled={(date) => editingEntryId ? true : !isSameDay(date, new Date())}
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Quarters (Select up to 2)</Label>
                                    <span className="text-[10px] font-bold text-primary">{(newEntry.quarters || []).length}/2 Selected</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'Q1', label: '1st Quarter', time: '12AM – 6AM' },
                                        { id: 'Q2', label: '2nd Quarter', time: '6AM – 12PM' },
                                        { id: 'Q3', label: '3rd Quarter', time: '12PM – 6PM' },
                                        { id: 'Q4', label: '4th Quarter', time: '6PM – 12AM' }
                                    ].map(q => {
                                        const isSelected = (newEntry.quarters || []).includes(q.id);
                                        const isUsed = usedQuarters.includes(q.id);
                                        return (
                                            <div 
                                                key={q.id}
                                                onClick={() => {
                                                    if (isUsed) return;
                                                    let newQuarters = [...(newEntry.quarters || [])];
                                                    if (isSelected) {
                                                        newQuarters = newQuarters.filter(x => x !== q.id);
                                                    } else if (newQuarters.length < 2) {
                                                        newQuarters.push(q.id);
                                                    }
                                                    setNewEntry({ ...newEntry, quarters: newQuarters });
                                                }}
                                                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[60px] ${
                                                    isUsed ? 'bg-muted/10 border-border opacity-50 cursor-not-allowed' :
                                                    isSelected
                                                        ? 'bg-primary border-primary text-white shadow-md cursor-pointer'
                                                        : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground cursor-pointer'
                                                }`}
                                            >
                                                <p className="font-bold text-xs">{q.label}</p>
                                                <p className={`text-[9px] mt-0.5 font-medium ${
                                                    isUsed ? 'text-muted-foreground' :
                                                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                                }`}>{isUsed ? 'Logged' : q.time}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {newEntry.quarters && newEntry.quarters.length > 0 && (
                                    <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                                        <div className="text-center">
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase">Total Shift</p>
                                            <p className="font-black text-sm text-foreground">{(newEntry.quarters.length * 4.75).toFixed(1)}h</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-red-500 font-bold uppercase">Non-Productive</p>
                                            <p className="font-black text-sm text-red-500">{(newEntry.quarters.length * 0.75).toFixed(1)}h</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-green-600 font-bold uppercase">Productive Log</p>
                                            <p className="font-black text-sm text-green-600">{(newEntry.quarters.length * 4.0).toFixed(1)}h</p>
                                        </div>
                                    </div>
                                )}
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
                                disabled={!!editingEntryId}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Task</Label>
                            <SearchableSelect
                                value={newEntry.taskId}
                                onChange={(val) => setNewEntry({ ...newEntry, taskId: val })}
                                disabled={!newEntry.projectId || !!editingEntryId}
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
                            {submitting ? "Saving..." : (editingEntryId ? "Update Hours" : "Log Hours")}
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