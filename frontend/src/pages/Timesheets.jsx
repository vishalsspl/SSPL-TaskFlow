import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    User as UserIcon,
    Settings
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { useTimerStore } from '@/store/timerStore';
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

const TIME_OPTIONS = [
    "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM", 
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM", 
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", 
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", 
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", 
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", 
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

const BREAK_OPTIONS = [
    { label: "No break", value: "0" },
    { label: "30 min", value: "0.5" },
    { label: "1 hour", value: "1" },
    { label: "1.5 hours", value: "1.5" },
    { label: "2 hours", value: "2" }
];

const PORTION_OPTIONS = [
    { id: '1/4', label: '1/4 Day', hours: 2.0, totalShift: 2.375, breakHrs: 0.375 },
    { id: '1/2', label: '1/2 Day', hours: 4.0, totalShift: 4.75, breakHrs: 0.75 },
    { id: '3/4', label: '3/4 Day', hours: 6.0, totalShift: 7.125, breakHrs: 1.125 },
    { id: 'full', label: 'Full Day', hours: 8.0, totalShift: 9.5, breakHrs: 1.5 }
];

const LEAVE_TYPES = [
    { id: 'Sick Leave', label: 'Sick Leave', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    { id: 'Casual Leave', label: 'Casual Leave', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    { id: 'Paid Leave', label: 'Paid Leave', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { id: 'Unpaid Leave', label: 'Unpaid Leave', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
];

const calculateCustomHours = (startTime, endTime) => {
    if (!startTime || !endTime) return { total: 0, productive: 0, nonProductive: 0 };
    
    const parseTimeToDecimal = (timeStr) => {
        const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
        if (!match) return 0;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        return hours + (minutes / 60);
    };

    const start = parseTimeToDecimal(startTime);
    let end = parseTimeToDecimal(endTime);
    
    if (end < start) {
        end += 24;
    }
    
    const total = end - start;
    
    return {
        total,
        productive: total,
        nonProductive: 0
    };
};

const getNonProductiveHoursForEntry = (entry) => {
    const desc = entry.description || '';
    if (desc.includes('[') && desc.includes(']')) {
        const leaveMatch = desc.match(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/);
        if (leaveMatch) {
            return 0;
        }
        const bracketMatch = desc.match(/\[(.*?)\]/);
        if (bracketMatch) {
            const text = bracketMatch[1];
            if (text.includes('Custom Shift:')) {
                const breakMatch = text.match(/Break\s*([\d.]+)\s*h/i);
                if (breakMatch) {
                    return parseFloat(breakMatch[1]) || 0;
                }
            } else if (text.includes('Day')) {
                const portionMap = { '1/4 Day': 0.375, '1/2 Day': 0.75, '3/4 Day': 1.125, 'Full Day': 1.5 };
                return portionMap[text] || 0;
            } else {
                let qCount = 0;
                if (text.includes('1st Quarter')) qCount++;
                if (text.includes('2nd Quarter')) qCount++;
                if (text.includes('3rd Quarter')) qCount++;
                if (text.includes('4th Quarter')) qCount++;
                return qCount * 0.75;
            }
        }
    }
    return 0;
};

const getDynamicPortions = (shiftSettings) => {
    const totalShift = calculateCustomHours(shiftSettings?.startTime || '10:00 AM', shiftSettings?.endTime || '07:30 PM').total;
    const workHours = totalShift;
    
    return [
        { id: '1/4', label: '1/4 Day', hours: workHours * 0.25 },
        { id: '1/2', label: '1/2 Day', hours: workHours * 0.5 },
        { id: '3/4', label: '3/4 Day', hours: workHours * 0.75 },
        { id: 'full', label: 'Full Day', hours: workHours }
    ];
};

const Timesheets = () => {
    const { user } = useAuthStore();
    const { setHeader } = useHeaderStore();
    const { toast } = useToast();
    const isTimerRunning = useTimerStore(state => state.isRunning);
    const prevIsTimerRunning = useRef(isTimerRunning);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('my-entries');
    const [entries, setEntries] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
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
    const [loggingMode, setLoggingMode] = useState('direct');
    const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');

    const isOrgAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    const uniqueUsers = useMemo(() => {
        const usersMap = new Map();
        entries.forEach(e => {
            if (e.user && e.user.id) usersMap.set(e.user.id, e.user);
        });
        return Array.from(usersMap.values());
    }, [entries]);

    const [orgShiftSettings, setOrgShiftSettings] = useState({
        startTime: '10:00 AM',
        endTime: '07:30 PM',
        breakHours: '1.5'
    });
    const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
    const [shiftForm, setShiftForm] = useState({
        startTime: '10:00 AM',
        endTime: '07:30 PM',
        breakHours: '1.5'
    });

    const [newEntry, setNewEntry] = useState({
        projectId: '',
        taskId: '',
        customHours: '',
        portion: '',
        leaveType: '',
        startTime: '10:00 AM',
        endTime: '07:30 PM',
        description: '',
        date: new Date(),
        billable: false
    });

    const weekDays = useMemo(() => [...Array(7)].map((_, i) => addDays(currentDate, -6 + i)), [currentDate]);

    const fetchOrgShift = useCallback(async () => {
        try {
            const res = await api.get('/organizations/me');
            if (res.data?.customFeatures?.shiftSettings) {
                setOrgShiftSettings(res.data.customFeatures.shiftSettings);
                setShiftForm(res.data.customFeatures.shiftSettings);
            }
        } catch (err) {
            // ignore silently
        }
    }, []);

    const fetchEntries = useCallback(async () => {
        try {
            const startD = new Date(weekDays[0]);
            startD.setHours(0, 0, 0, 0);
            const endD = new Date(weekDays[6]);
            endD.setHours(23, 59, 59, 999);
            
            const startDate = startD.toISOString();
            const endDate = endD.toISOString();
            
            const response = await api.get(`/timesheets?startDate=${startDate}&endDate=${endDate}`);
            setEntries(response.data.entries || response.data);
            setAttendanceSummary(response.data.attendanceSummary || []);
        } catch (error) {
            console.error('Failed to fetch entries:', error);
        } finally {
            setLoading(false);
        }
    }, [weekDays]);

    const fetchPendingLeaves = useCallback(async () => {
        if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') return;
        try {
            const response = await api.get('/timesheets');
            const data = response.data.entries || response.data;
            const leaves = data.filter(e => e.userId !== user?.id && /\[.*Leave.*\]/i.test(e.description || ''));
            setPendingLeaves(leaves);
        } catch (error) {
            console.error('Failed to fetch pending leaves:', error);
        }
    }, [user?.role, user?.id]);

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
        fetchPendingLeaves();
        fetchProjects();
        fetchOrgShift();
    }, [setHeader, fetchEntries, fetchPendingLeaves, fetchProjects, fetchOrgShift]);

    useEffect(() => {
        if (prevIsTimerRunning.current && !isTimerRunning) {
            fetchEntries();
        }
        prevIsTimerRunning.current = isTimerRunning;
    }, [isTimerRunning, fetchEntries]);

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleLogHours = async () => {
        if (!newEntry.date) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a log date."
            });
            return;
        }

        if (loggingMode !== 'leave' && (!newEntry.projectId || (!newEntry.taskId && !editingEntryId))) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a project and a task."
            });
            return;
        }

        let productiveHours = 0;
        let description = '';

        if (loggingMode === 'custom') {
            const { total, productive, nonProductive } = calculateCustomHours(newEntry.startTime, newEntry.endTime);
            if (total <= 0) {
                toast({ variant: "destructive", title: "Validation Error", description: "Please select a valid time range." });
                return;
            }
            if (productive <= 0) {
                toast({ variant: "destructive", title: "Validation Error", description: "Productive hours cannot be zero or negative. Please reduce break duration." });
                return;
            }
            productiveHours = productive;
            const timeText = `Custom Shift: ${newEntry.startTime}–${newEntry.endTime}`;
            const baseDesc = newEntry.description.replace(/\s*-\s*\[Custom Shift:.*?\]/i, '').trim();
            description = baseDesc ? `${baseDesc} - [${timeText}]` : `Logged for [${timeText}]`;
        } else if (loggingMode === 'direct') {
            productiveHours = parseFloat(newEntry.customHours);
            if (isNaN(productiveHours) || productiveHours <= 0) {
                toast({ variant: "destructive", title: "Validation Error", description: "Please enter a valid number of hours." });
                return;
            }
            const timeText = `Direct Hours: ${productiveHours}h`;
            const baseDesc = newEntry.description.replace(/\s*-\s*\[Direct Hours:.*?\]/i, '').trim();
            description = baseDesc ? `${baseDesc} - [${timeText}]` : `Logged for [${timeText}]`;
        } else if (loggingMode === 'leave') {
            if (!newEntry.leaveType || !newEntry.portion) {
                toast({ variant: "destructive", title: "Validation Error", description: "Please select a leave type and duration." });
                return;
            }
            const portionInfo = getDynamicPortions(orgShiftSettings).find(p => p.id === newEntry.portion);
            productiveHours = portionInfo.hours;
            description = newEntry.description
                ? `[${newEntry.leaveType}] - [${portionInfo.label}] - ${newEntry.description}`
                : `[${newEntry.leaveType}] - [${portionInfo.label}]`;
        }

        let projectId = newEntry.projectId;
        let taskId = newEntry.taskId;
        if (loggingMode === 'leave') {
            projectId = null;
            taskId = null;
        }

        if (loggingMode !== 'leave' && newEntry.date > new Date()) {
            toast({ variant: "destructive", title: "Validation Error", description: "Cannot log work hours for future dates. Use Leave Log for future entries." });
            return;
        }

        const usedHours = getUsedHoursForDate(newEntry.date, editingEntryId);
        if (usedHours + productiveHours > 24) {
            toast({ variant: "destructive", title: "Validation Error", description: "You can't add hours above 24 hours in a single day." });
            return;
        }

        setSubmitting(true);
        try {
            if (editingEntryId) {
                await api.put(`/timesheets/${editingEntryId}`, {
                    hours: productiveHours,
                    description,
                    billable: newEntry.billable
                });
                toast({ title: "Success", description: "Hours updated successfully." });
            } else {
                await api.post('/timesheets', {
                    projectId,
                    taskId,
                    hours: productiveHours,
                    description,
                    date: format(newEntry.date, 'yyyy-MM-dd'),
                    billable: newEntry.billable
                });
                toast({ title: "Success", description: loggingMode === 'leave' ? "Leave logged successfully." : "Hours logged successfully." });
            }

            setIsLogDialogOpen(false);
            setEditingEntryId(null);
            setLoggingMode('direct');
            setNewEntry({
                projectId: '',
                taskId: '',
                customHours: '',
                portion: '',
                leaveType: '',
                startTime: orgShiftSettings.startTime,
                endTime: orgShiftSettings.endTime,
                breakHours: orgShiftSettings.breakHours,
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

    const handleSaveShiftSettings = async () => {
        try {
            setSubmitting(true);
            await api.put('/organizations/me', { shiftSettings: shiftForm });
            setOrgShiftSettings(shiftForm);
            setIsShiftDialogOpen(false);
            toast({ title: "Success", description: "Organization shift settings updated successfully." });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update shift settings." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditEntry = (entry) => {
        let portion = '';
        let leaveType = '';
        let startTime = orgShiftSettings.startTime;
        let endTime = orgShiftSettings.endTime;
        let breakHours = orgShiftSettings.breakHours;
        let customHours = '';
        let baseDescription = entry.description || '';
        let detectedMode = 'custom';

        if (baseDescription.includes('[') && baseDescription.includes(']')) {
            const leaveMatch = baseDescription.match(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]\s*-\s*\[(1\/4 Day|1\/2 Day|3\/4 Day|Full Day)\]/);
            if (leaveMatch) {
                detectedMode = 'leave';
                leaveType = leaveMatch[1];
                const portionLabel = leaveMatch[2];
                const portionMap = { '1/4 Day': '1/4', '1/2 Day': '1/2', '3/4 Day': '3/4', 'Full Day': 'full' };
                portion = portionMap[portionLabel] || '';
                baseDescription = baseDescription.replace(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]\s*-\s*\[(1\/4 Day|1\/2 Day|3\/4 Day|Full Day)\]\s*-?\s*/, '').trim();
            } else {
                const bracketMatch = baseDescription.match(/\[(.*?)\]/);
                if (bracketMatch) {
                    const text = bracketMatch[1];
                    if (text.includes('Custom Shift:')) {
                        detectedMode = 'custom';
                        const partsMatch = text.match(/Custom Shift:\s*([^-–—\s]+(?:\s*[AP]M)?)\s*[-–—]\s*([^\(]+?)\s*\(Break\s*([\d.]+)\s*h\)/i);
                        if (partsMatch) {
                            startTime = partsMatch[1].trim();
                            endTime = partsMatch[2].trim();
                            breakHours = partsMatch[3].trim();
                        }
                    } else if (text.includes('Direct Hours:')) {
                        detectedMode = 'direct';
                        const directMatch = text.match(/Direct Hours:\s*([\d.]+)/i);
                        if (directMatch) {
                            customHours = directMatch[1].trim();
                        }
                    }
                    baseDescription = baseDescription.replace(` - [${text}]`, '').replace(`Logged for [${text}]`, '').trim();
                }
            }
        }

        setLoggingMode(detectedMode);
        setEditingEntryId(entry.id);
        setNewEntry({
            projectId: entry.projectId,
            taskId: entry.taskId || '',
            customHours: customHours,
            portion,
            leaveType,
            startTime,
            endTime,
            breakHours,
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
            fetchPendingLeaves();
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

    const getStatusBadge = (entry) => {
        const status = entry.status;
        const reviewerText = entry.reviewer ? ` by ${entry.reviewer.name.split(' ')[0]}` : '';
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold uppercase text-[10px] tracking-wider">Approved{reviewerText}</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="font-bold uppercase text-[10px] tracking-wider">Rejected{reviewerText}</Badge>;
            default: return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-bold uppercase text-[10px] tracking-wider">Pending</Badge>;
        }
    };

    const getUsedHoursForDate = (dateToVerify, ignoreEntryId = null) => {
        const dateEntries = entries.filter(e =>
            e.userId === user?.id &&
            isSameDay(parseISO(e.date), dateToVerify) &&
            e.id !== ignoreEntryId
        );
        return dateEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
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

    const getPortionTags = (desc) => {
        if (!desc) return { portions: [], leaveType: null };
        let portions = [];
        let leaveType = null;

        const leaveMatch = desc.match(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/);
        if (leaveMatch) {
            leaveType = leaveMatch[1];
        }

        if (desc.includes('[') && desc.includes(']')) {
            const portionMatch = desc.match(/\[(1\/4 Day|1\/2 Day|3\/4 Day|Full Day)\]/);
            if (portionMatch) {
                portions.push(portionMatch[1]);
            } else {
                const bracketMatch = desc.match(/\[(.*?)\]/);
                if (bracketMatch) {
                    const text = bracketMatch[1];
                    if (text.includes('Custom Shift:')) {
                        const timeMatch = text.match(/Custom Shift:\s*([^\(]+)/i);
                        if (timeMatch) portions.push(timeMatch[1].trim());
                        else portions.push('Custom');
                    }
                }
            }
        }
        return { portions, leaveType };
    };

    const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    
    const hasApprovePermission = useMemo(() => {
        if (!user) return false;
        if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true;
        const perms = user.organization?.rolePermissions;
        if (perms && perms[user.role] && typeof perms[user.role]['timesheets.approve'] === 'boolean') {
            return perms[user.role]['timesheets.approve'];
        }
        return user.role === 'MANAGER';
    }, [user]);
    
    return (
        <div className="flex-1 space-y-4 p-0 sm:p-2 overflow-y-auto h-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {!isOrgAdmin && (
                        <Button 
                            onClick={() => {
                                setEditingEntryId(null);
                                setLoggingMode('direct');
                                setNewEntry({
                                    projectId: '',
                                    taskId: '',
                                    customHours: '',
                                    portion: '',
                                    leaveType: '',
                                    startTime: orgShiftSettings.startTime,
                                    endTime: orgShiftSettings.endTime,
                                    breakHours: orgShiftSettings.breakHours,
                                    description: '',
                                    date: selectedDateFilter || new Date(),
                                    billable: false
                                });
                                setIsLogDialogOpen(true);
                            }} 
                            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Log Hours
                        </Button>
                    )}
                    {isOrgAdmin && (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => setIsShiftDialogOpen(true)}
                                className="rounded-xl h-10 px-4 font-bold border-primary/20 hover:bg-primary/5 text-primary w-full sm:w-auto shrink-0"
                            >
                                <Settings className="mr-2 h-4 w-4" /> Set Org Shift
                            </Button>
                            <Select value={selectedMemberFilter} onValueChange={setSelectedMemberFilter}>
                                <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl font-bold bg-muted/30 border-border">
                                    <SelectValue placeholder="Filter Member" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-card">
                                    <SelectItem value="all" className="font-bold cursor-pointer rounded-lg">All Members</SelectItem>
                                    {uniqueUsers.map(u => (
                                        <SelectItem key={u.id} value={u.id} className="font-bold cursor-pointer rounded-lg">
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                                <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl font-bold bg-muted/30 border-border">
                                    <SelectValue placeholder="Filter Project" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-card">
                                    <SelectItem value="all" className="font-bold cursor-pointer rounded-lg">All Projects</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="font-bold cursor-pointer rounded-lg">
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full justify-center sm:w-auto">
                        <Button variant="outline" size="icon" onClick={handlePrevWeek} className="rounded-lg h-9 w-9 shrink-0">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={handleToday} className="rounded-lg h-9 font-bold px-4 flex-1 sm:flex-none">
                            Today
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleNextWeek} className="rounded-lg h-9 w-9 shrink-0">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <h2 className="font-black Montserrat text-sm sm:text-lg text-foreground whitespace-nowrap">
                        {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d')}
                        <span className="hidden sm:inline">, {format(weekDays[6], 'yyyy')}</span>
                    </h2>
                </div>
            </div>

            {activeTab !== 'leave-logs' && (() => {
                // Pre-calculate all 7 days for weekly summary
                const weekData = weekDays.map((day) => {
                    // Calculate target entries based on mode and filters
                    const targetEntries = isOrgAdmin 
                        ? entries.filter(e => (selectedMemberFilter === 'all' ? true : e.userId === selectedMemberFilter) && (selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter))
                        : (activeTab === 'team-logs' || activeTab === 'leave-logs') 
                            ? entries.filter(e => e.userId !== user?.id && (selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter))
                            : entries.filter(e => e.userId === user?.id && (selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter));
                    
                    const myDayEntries = targetEntries.filter(e => isSameDay(parseISO(e.date), day));
                    
                    // Separate leave entries from work entries
                    const leaveEntries = myDayEntries.filter(e => {
                        const desc = e.description || '';
                        return /\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/.test(desc);
                    });
                    const workEntries = myDayEntries.filter(e => {
                        const desc = e.description || '';
                        return !/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/.test(desc);
                    });

                    const leaveHours = leaveEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
                    const billableHours = workEntries.filter(e => e.billable).reduce((sum, e) => sum + parseFloat(e.hours), 0);
                    const prodHours = workEntries.filter(e => !e.billable).reduce((sum, e) => sum + parseFloat(e.hours), 0);
                    
                    let nonProdHours = 0;
                    const userWorkEntries = {};
                    workEntries.forEach(e => {
                        if (!userWorkEntries[e.userId]) userWorkEntries[e.userId] = [];
                        userWorkEntries[e.userId].push(e);
                    });
                    
                    Object.values(userWorkEntries).forEach(uEntries => {
                        const uProd = uEntries.reduce((s, e) => s + parseFloat(e.hours), 0);
                        let uNonProd = uEntries.reduce((s, e) => s + getNonProductiveHoursForEntry(e), 0);
                        const hasDirect = uEntries.some(e => e.isManual && (!e.description || !e.description.includes('[')));
                        if (hasDirect && orgShiftSettings?.startTime && orgShiftSettings?.endTime) {
                            const tShift = calculateCustomHours(orgShiftSettings.startTime, orgShiftSettings.endTime).total;
                            uNonProd = Math.max(0, tShift - uProd);
                        }
                        nonProdHours += uNonProd;
                    });
                    
                    const totalDayHours = billableHours + prodHours + nonProdHours + leaveHours;
                    return { day, billableHours, prodHours, nonProdHours, leaveHours, totalDayHours };
                });

                // Weekly totals
                const weeklyBillable = weekData.reduce((s, d) => s + d.billableHours, 0);
                const weeklyProd = weekData.reduce((s, d) => s + d.prodHours, 0);
                const weeklyNonProd = weekData.reduce((s, d) => s + d.nonProdHours, 0);
                const weeklyLeave = weekData.reduce((s, d) => s + d.leaveHours, 0);
                const weeklyTotal = weeklyBillable + weeklyProd + weeklyNonProd + weeklyLeave;
                const pct = (v) => weeklyTotal > 0 ? Math.round((v / weeklyTotal) * 100) : 0;

                return (
                    <>
                        <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x snap-mandatory sm:grid-cols-7 gap-2 sm:gap-3">
                            {weekData.map(({ day, billableHours, prodHours, nonProdHours, leaveHours, totalDayHours }) => {
                                const isToday = isSameDay(day, new Date());
                                const isSelected = selectedDateFilter && isSameDay(day, selectedDateFilter);
                                const dayPct = (v) => totalDayHours > 0 ? Math.round((v / totalDayHours) * 100) : 0;
                                const hasAnyHours = totalDayHours > 0;

                                return (
                                    <Card 
                                        key={day.toString()} 
                                        onClick={() => setSelectedDateFilter(day)}
                                        className={`relative border-none shadow-md overflow-hidden transition-all duration-300 flex flex-col cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-w-[70px] sm:min-w-0 snap-center shrink-0 ${
                                            isSelected ? 'ring-2 ring-primary bg-primary/10' : 'bg-card hover:bg-muted/30'
                                        }`}
                                    >
                                        {/* Leave background fill */}
                                        {leaveHours > 0 && (
                                            <div 
                                                className="absolute bottom-0 left-0 right-0 bg-amber-100 dark:bg-amber-500/15 pointer-events-none transition-all duration-500" 
                                                style={{ height: `${dayPct(leaveHours)}%` }} 
                                            />
                                        )}
                                        <CardHeader className="relative z-10 p-1 sm:p-2 text-center border-b border-border/50 bg-muted/10">
                                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(day, 'EEE')}</p>
                                            <div className={`mt-1 h-6 w-6 sm:h-7 sm:w-7 mx-auto rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs ${isToday || isSelected ? 'bg-primary text-white' : 'text-foreground'}`}>
                                                {format(day, 'd')}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="relative z-10 p-1 sm:p-2 flex-1 flex flex-col justify-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className={`text-sm sm:text-lg font-black Montserrat ${hasAnyHours ? 'text-green-500' : 'text-muted-foreground opacity-30'}`}>
                                                    {hasAnyHours ? totalDayHours.toFixed(1) : '0.0'}
                                                </span>
                                                {hasAnyHours ? (
                                                    <div className="flex flex-col items-center mt-1 w-full space-y-0.5">
                                                        {billableHours > 0 && <span className="text-[7px] sm:text-[9px] font-bold text-amber-500 uppercase">Bill: {billableHours.toFixed(1)}h ({dayPct(billableHours)}%)</span>}
                                                        <span className="text-[7px] sm:text-[9px] font-bold text-green-500 uppercase">Prod: {prodHours.toFixed(1)}h ({dayPct(prodHours)}%)</span>
                                                        <span className="text-[7px] sm:text-[9px] font-bold text-red-500 uppercase">Non: {nonProdHours.toFixed(1)}h ({dayPct(nonProdHours)}%)</span>
                                                        {leaveHours > 0 && (
                                                            <span className="text-[7px] sm:text-[9px] font-bold text-blue-500 uppercase">Leave: {leaveHours.toFixed(1)}h ({dayPct(leaveHours)}%)</span>
                                                        )}
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

                        {/* Weekly Summary */}
                        {weeklyTotal > 0 && (
                            <Card className="border-none shadow-md bg-card overflow-hidden rounded-2xl">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">Weekly Summary</p>
                                                <p className="text-lg sm:text-xl font-black Montserrat text-foreground">{weeklyTotal.toFixed(1)} <span className="text-xs font-bold text-muted-foreground">Total Hours</span></p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                                                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600">Billable</span>
                                                    <span className="text-xs sm:text-sm font-black Montserrat text-amber-600">{weeklyBillable.toFixed(1)}h <span className="text-[9px] font-bold">({pct(weeklyBillable)}%)</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-green-600">Productive</span>
                                                    <span className="text-xs sm:text-sm font-black Montserrat text-green-600">{weeklyProd.toFixed(1)}h <span className="text-[9px] font-bold">({pct(weeklyProd)}%)</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                                                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-red-600">Non-Productive</span>
                                                    <span className="text-xs sm:text-sm font-black Montserrat text-red-600">{weeklyNonProd.toFixed(1)}h <span className="text-[9px] font-bold">({pct(weeklyNonProd)}%)</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-600">Leave</span>
                                                    <span className="text-xs sm:text-sm font-black Montserrat text-blue-600">{weeklyLeave.toFixed(1)}h <span className="text-[9px] font-bold">({pct(weeklyLeave)}%)</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-3 h-2.5 w-full rounded-full bg-muted/30 overflow-hidden flex">
                                        {weeklyBillable > 0 && <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pct(weeklyBillable)}%` }}></div>}
                                        {weeklyProd > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct(weeklyProd)}%` }}></div>}
                                        {weeklyNonProd > 0 && <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${pct(weeklyNonProd)}%` }}></div>}
                                        {weeklyLeave > 0 && <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct(weeklyLeave)}%` }}></div>}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                );
            })()}

            {isOrgAdmin ? (
                <div className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">
                                {selectedMemberFilter === 'all' 
                                    ? 'All Team Logs' 
                                    : `Logs for ${uniqueUsers.find(u => u.id === selectedMemberFilter)?.name || 'Member'}`}
                                {selectedDateFilter && ` - ${format(selectedDateFilter, 'MMM d, yyyy')}`}
                            </CardTitle>
                            <CardDescription className="text-xs font-medium">Review, approve, or reject time logs from your team</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {(() => {
                                    const filteredEntries = entries.filter(e => {
                                        if (selectedDateFilter && !isSameDay(parseISO(e.date), selectedDateFilter)) return false;
                                        if (selectedMemberFilter !== 'all' && e.userId !== selectedMemberFilter) return false;
                                        return true;
                                    }).sort((a, b) => new Date(b.date) - new Date(a.date));

                                    if (filteredEntries.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                                <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
                                                <p className="font-bold text-muted-foreground Montserrat">No logs found.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="divide-y divide-border">
                                            {filteredEntries.map((entry) => (
                                                <div key={entry.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                        <Avatar className="h-9 w-9 border shrink-0">
                                                            <AvatarImage src={entry.user?.avatar} />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                {entry.user?.name?.charAt(0) || '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm Montserrat">{entry.user?.name || 'Unknown'}</h4>
                                                            <div className="text-[10px] text-muted-foreground font-bold uppercase truncate flex items-center gap-2">
                                                                <span>{entry.project?.name || 'Leave'} &bull; {format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                                                                {(() => {
                                                                    const { portions, leaveType } = getPortionTags(entry.description);
                                                                    if (portions.length === 0 && !leaveType) return null;
                                                                    return (
                                                                        <div className="flex gap-1 border-l pl-2 border-border">
                                                                            {leaveType && (
                                                                                <Badge variant="outline" className={`text-[8px] h-3 px-1 py-0 font-bold ${
                                                                                    leaveType === 'Sick Leave' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                    leaveType === 'Casual Leave' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                                    leaveType === 'Paid Leave' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                }`}>
                                                                                    {leaveType}
                                                                                </Badge>
                                                                            )}
                                                                            {portions.map(p => (
                                                                                <Badge key={p} variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/30 text-primary bg-primary/5 uppercase font-bold">
                                                                                    {p}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{getCleanDescription(entry.description)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(entry)}
                                                            {/* Approve/Reject buttons hidden for admin view */}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-card border border-border p-1 gap-2 rounded-xl mb-4">
                    <TabsTrigger value="my-entries" className="rounded-lg font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        My Logs
                    </TabsTrigger>
                    {isManagerOrAdmin && (
                        <>
                            <TabsTrigger value="team-logs" className="rounded-lg font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2">
                                Team Logs
                                {(() => {
                                    const teamLogsCount = entries
                                        .filter(e => e.userId !== user?.id)
                                        .filter(e => e.status === 'PENDING')
                                        .filter(e => selectedDateFilter ? isSameDay(parseISO(e.date), selectedDateFilter) : true)
                                        .filter(e => selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter)
                                        .length;
                                    return teamLogsCount > 0 ? (
                                        <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 rounded-full px-2 py-0 text-[10px]">
                                            {teamLogsCount}
                                        </Badge>
                                    ) : null;
                                })()}
                            </TabsTrigger>
                            <TabsTrigger value="leave-logs" className="rounded-lg font-bold data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 flex items-center gap-2">
                                Leave Logs
                                {(() => {
                                    const pendingCount = pendingLeaves.filter(e => e.status === 'PENDING').length;
                                    return pendingCount > 0 ? (
                                        <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600 rounded-full px-2 py-0 text-[10px]">
                                            {pendingCount}
                                        </Badge>
                                    ) : null;
                                })()}
                            </TabsTrigger>
                        </>
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
                                {entries.filter(e => (isOrgAdmin && selectedMemberFilter !== 'all' ? e.userId === selectedMemberFilter : e.userId === user?.id) && isSameDay(parseISO(e.date), selectedDateFilter) && (selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter)).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <Clock className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No hours logged for this day.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => (isOrgAdmin && selectedMemberFilter !== 'all' ? e.userId === selectedMemberFilter : e.userId === user?.id))
                                            .filter(e => selectedDateFilter ? isSameDay(parseISO(e.date), selectedDateFilter) : true)
                                            .filter(e => selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter)
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((entry) => (
                                                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                                                            <span className="font-black text-primary text-xs">{format(parseISO(entry.date), 'dd')}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm truncate Montserrat">{entry.project?.name || 'Leave'}</h4>
                                                            <p className="text-[11px] text-muted-foreground font-medium line-clamp-1 italic">
                                                                {entry.task?.title ? `${entry.task.title} — ` : ''}{getCleanDescription(entry.description)}
                                                            </p>
                                                            {(() => {
                                                                const { portions, leaveType } = getPortionTags(entry.description);
                                                                if (portions.length === 0 && !leaveType) return null;
                                                                return (
                                                                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                                                        {leaveType && (
                                                                            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 py-0 font-bold tracking-widest ${
                                                                                leaveType === 'Sick Leave' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                leaveType === 'Casual Leave' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                                leaveType === 'Paid Leave' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                            }`}>
                                                                                {leaveType}
                                                                            </Badge>
                                                                        )}
                                                                        {portions.map(p => (
                                                                            <Badge key={p} variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-primary/30 text-primary bg-primary/10 uppercase font-bold tracking-widest">
                                                                                {p}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right sr-only sm:not-sr-only">
                                                            <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(parseISO(entry.date), 'MMM d, EEE')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(entry)}
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
                                                                    {hasApprovePermission && (
                                                                        <div className="flex items-center gap-1 border-l pl-1 border-border ml-1">
                                                                            <Button size="icon" variant="outline" className="h-8 w-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'REJECTED')} title="Reject">
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'APPROVED')} title="Approve">
                                                                                <Check className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {hasApprovePermission && entry.status === 'APPROVED' && (
                                                                <div className="flex items-center gap-1 transition-all border-l pl-2 border-border ml-2">
                                                                    <Button size="icon" variant="outline" className="h-8 w-8 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'PENDING')} title="Reset to Pending">
                                                                        <Clock className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="outline" className="h-8 w-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'REJECTED')} title="Reject">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {hasApprovePermission && entry.status === 'REJECTED' && (
                                                                <div className="flex items-center gap-1 transition-all border-l pl-2 border-border ml-2">
                                                                    <Button size="icon" variant="outline" className="h-8 w-8 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'PENDING')} title="Reset to Pending">
                                                                        <Clock className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={() => handleStatusUpdate(entry.id, 'APPROVED')} title="Approve">
                                                                        <Check className="h-4 w-4" />
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
                                {entries.filter(e => e.userId !== user?.id && (!selectedDateFilter || isSameDay(parseISO(e.date), selectedDateFilter)) && (selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter)).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No team logs found for this day.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {entries
                                            .filter(e => e.userId !== user?.id)
                                            .filter(e => selectedDateFilter ? isSameDay(parseISO(e.date), selectedDateFilter) : true)
                                            .filter(e => selectedProjectFilter === 'all' ? true : e.projectId === selectedProjectFilter)
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
                                                                <span>{entry.project?.name || 'Leave'} &bull; {format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                                                                {(() => {
                                                                    const { portions, leaveType } = getPortionTags(entry.description);
                                                                    if (portions.length === 0 && !leaveType) return null;
                                                                    return (
                                                                        <div className="flex gap-1 border-l pl-2 border-border">
                                                                            {leaveType && (
                                                                                <Badge variant="outline" className={`text-[8px] h-3 px-1 py-0 font-bold ${
                                                                                    leaveType === 'Sick Leave' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                    leaveType === 'Casual Leave' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                                    leaveType === 'Paid Leave' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                }`}>
                                                                                    {leaveType}
                                                                                </Badge>
                                                                            )}
                                                                            {portions.map(p => (
                                                                                <Badge key={p} variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/30 text-primary bg-primary/5 uppercase font-bold">
                                                                                    {p}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{getCleanDescription(entry.description)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(entry)}
                                                            {hasApprovePermission && (
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

                <TabsContent value="leave-logs" className="space-y-4">
                    <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-black Montserrat">Leave Requests</CardTitle>
                            <CardDescription className="text-xs font-medium">Review and manage leave requests from your team</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                {pendingLeaves.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
                                        <p className="font-bold text-muted-foreground Montserrat">No leave requests found.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {pendingLeaves.map((entry) => (
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
                                                            <span>{entry.project?.name || 'Leave'} &bull; {format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                                                            {(() => {
                                                                const { portions, leaveType } = getPortionTags(entry.description);
                                                                if (portions.length === 0 && !leaveType) return null;
                                                                return (
                                                                    <div className="flex gap-1 border-l pl-2 border-border">
                                                                        {leaveType && (
                                                                            <Badge variant="outline" className={`text-[8px] h-3 px-1 py-0 font-bold ${
                                                                                leaveType === 'Sick Leave' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                                leaveType === 'Casual Leave' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                                leaveType === 'Paid Leave' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                            }`}>
                                                                                {leaveType}
                                                                            </Badge>
                                                                        )}
                                                                        {portions.map(p => (
                                                                            <Badge key={p} variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/30 text-primary bg-primary/5 uppercase font-bold">
                                                                                {p}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 italic">{getCleanDescription(entry.description)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-black Montserrat">{entry.hours}h</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(entry)}
                                                        {hasApprovePermission && (
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
                </Tabs>
            )}

            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogContent className="bg-card border-border shadow-2xl rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black Montserrat">{editingEntryId ? 'Edit Project Hours' : 'Log Project Hours'}</DialogTitle>
                        <DialogDescription className="font-medium text-xs">Fill in the details below to record your work time.</DialogDescription>
                        
                        <div className="flex border border-border rounded-xl p-1 bg-muted/20 mt-3 gap-1">

                            <button
                                type="button"
                                onClick={() => setLoggingMode('direct')}
                                className={`flex-1 text-center py-2 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all ${
                                    loggingMode === 'direct'
                                        ? 'bg-primary text-white shadow'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Direct Hours
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoggingMode('leave')}
                                className={`flex-1 text-center py-2 text-[9px] sm:text-[11px] font-bold rounded-lg transition-all ${
                                    loggingMode === 'leave'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Leave Log
                            </button>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[65vh] pr-4 -mr-4">
                    <div className="space-y-3 py-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log Date</Label>
                            <DatePicker
                                date={newEntry.date}
                                setDate={(date) => setNewEntry({ ...newEntry, date: date })}
                                placeholder="Select date"
                                className="bg-muted/30 border-border rounded-xl font-bold h-11"
                                disabled={(date) => {
                                    if (editingEntryId) return true;
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const d = new Date(date);
                                    d.setHours(0,0,0,0);
                                    if (loggingMode === 'leave') {
                                        const maxDate = new Date();
                                        maxDate.setDate(maxDate.getDate() + 31);
                                        maxDate.setHours(0,0,0,0);
                                        return d > maxDate;
                                    }
                                    return d > today;
                                }}
                            />
                        </div>

                        {loggingMode === 'custom' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Start Time</Label>
                                        <Select
                                            value={newEntry.startTime}
                                            onValueChange={(val) => setNewEntry({ ...newEntry, startTime: val })}
                                        >
                                            <SelectTrigger className="h-10 bg-muted/30 border-border rounded-xl font-bold text-[10px] sm:text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border max-h-[160px] bg-card text-foreground">
                                                {TIME_OPTIONS.map(t => (
                                                    <SelectItem key={t} value={t} className="rounded-lg text-[10px] sm:text-xs font-bold">{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">End Time</Label>
                                        <Select
                                            value={newEntry.endTime}
                                            onValueChange={(val) => setNewEntry({ ...newEntry, endTime: val })}
                                        >
                                            <SelectTrigger className="h-10 bg-muted/30 border-border rounded-xl font-bold text-[10px] sm:text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border max-h-[160px] bg-card text-foreground">
                                                {TIME_OPTIONS.map(t => (
                                                    <SelectItem key={t} value={t} className="rounded-lg text-[10px] sm:text-xs font-bold">{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {(() => {
                                    const { total, productive, nonProductive } = calculateCustomHours(newEntry.startTime, newEntry.endTime);
                                    return total > 0 ? (
                                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Shift</p>
                                                <p className="font-black text-sm text-foreground">{total.toFixed(1)}h</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-red-500 uppercase">Non-Productive</p>
                                                <p className="font-black text-sm text-red-500">{nonProductive.toFixed(1)}h</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Productive Log</p>
                                                <p className="font-black text-sm text-emerald-600">{productive.toFixed(1)}h</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                                            <p className="text-[10px] font-bold text-red-500">Invalid Time Range Selected</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {loggingMode === 'direct' && (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hours to Log</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 5"
                                        value={newEntry.customHours}
                                        onChange={(e) => setNewEntry({ ...newEntry, customHours: e.target.value })}
                                        className="bg-muted/30 border-border rounded-xl font-bold h-11"
                                        min="0"
                                        step="0.25"
                                        max="24"
                                    />
                                </div>
                                {(() => {
                                    const totalShift = calculateCustomHours(orgShiftSettings.startTime, orgShiftSettings.endTime).total;
                                    const productive = parseFloat(newEntry.customHours) || 0;
                                    const nonProductive = Math.max(0, totalShift - productive);
                                    return totalShift > 0 && productive > 0 ? (
                                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Shift</p>
                                                <p className="font-black text-sm text-foreground">{totalShift.toFixed(1)}h</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-red-500 uppercase">Non-Productive</p>
                                                <p className="font-black text-sm text-red-500">{nonProductive.toFixed(1)}h</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Productive Log</p>
                                                <p className="font-black text-sm text-emerald-600">{productive.toFixed(1)}h</p>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}

                        {loggingMode === 'leave' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leave Type</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {LEAVE_TYPES.map(lt => {
                                            const isSelected = newEntry.leaveType === lt.id;
                                            return (
                                                <div
                                                    key={lt.id}
                                                    onClick={() => setNewEntry({ ...newEntry, leaveType: isSelected ? '' : lt.id })}
                                                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? `${lt.color} border-current shadow-md font-bold`
                                                            : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
                                                    }`}
                                                >
                                                    <p className="font-bold text-xs">{lt.label}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leave Duration</Label>
                                        <span className="text-[10px] font-bold text-emerald-600">{newEntry.portion ? getDynamicPortions(orgShiftSettings).find(p => p.id === newEntry.portion)?.label : 'None'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {getDynamicPortions(orgShiftSettings).map(p => {
                                            const isSelected = newEntry.portion === p.id;
                                            const usedHours = getUsedHoursForDate(newEntry.date, editingEntryId);
                                            const maxShiftHours = calculateCustomHours(orgShiftSettings?.startTime || '10:00 AM', orgShiftSettings?.endTime || '07:30 PM').total;
                                            const remainingHours = maxShiftHours - usedHours;
                                            const exceedsLimit = p.hours > remainingHours;
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        if (exceedsLimit) return;
                                                        setNewEntry({ ...newEntry, portion: isSelected ? '' : p.id });
                                                    }}
                                                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[56px] ${
                                                        exceedsLimit ? 'bg-muted/10 border-border opacity-40 cursor-not-allowed' :
                                                        isSelected
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md cursor-pointer'
                                                            : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground cursor-pointer'
                                                    }`}
                                                >
                                                    <p className="font-bold text-xs">{p.label}</p>
                                                    <p className={`text-[9px] mt-0.5 font-medium ${
                                                        exceedsLimit ? 'text-red-400' :
                                                        isSelected ? 'text-white/80' : 'text-muted-foreground'
                                                    }`}>{exceedsLimit ? 'Exceeds Limit' : `${p.hours.toFixed(1)}h`}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {loggingMode !== 'leave' && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Project</Label>
                                    <SearchableSelect
                                        value={newEntry.projectId || ''}
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
                            </>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Input
                                placeholder={loggingMode === 'leave' ? 'Reason for leave (optional)...' : 'Briefly describe what you worked on... (Optional)'}
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
                    </ScrollArea>

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

            <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-card text-foreground rounded-2xl border-border">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center">
                            <Settings className="mr-2 h-5 w-5 text-primary" />
                            Set Org Shift Time
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[65vh] pr-4 -mr-4">
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Shift Start Time</Label>
                            <Select value={shiftForm.startTime} onValueChange={(val) => setShiftForm({...shiftForm, startTime: val})}>
                                <SelectTrigger className="rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Shift End Time</Label>
                            <Select value={shiftForm.endTime} onValueChange={(val) => setShiftForm({...shiftForm, endTime: val})}>
                                <SelectTrigger className="rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsShiftDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleSaveShiftSettings} disabled={submitting} className="rounded-xl font-bold">
                            {submitting ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Timesheets;