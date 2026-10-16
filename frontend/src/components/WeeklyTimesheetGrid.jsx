import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
    isSameDay,
    isSameWeek,
    isAfter,
    isBefore,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Lock,
    Clock,
    Trash2,
    Check,
    FolderKanban,
    CheckSquare,
    Info,
    CalendarDays,
    X,
    User as UserIcon,
    Send
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const parseTimeToDecimal = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours + (minutes / 60);
};

const calculateCustomHours = (startTime, endTime) => {
    if (!startTime || !endTime) return { total: 8, productive: 8, nonProductive: 0 };
    const start = parseTimeToDecimal(startTime);
    let end = parseTimeToDecimal(endTime);
    if (end < start) end += 24;
    const total = end - start;
    return { total, productive: total, nonProductive: 0 };
};

export default function WeeklyTimesheetGrid({
    user,
    orgShiftSettings,
    selectedMemberFilter = 'all',
    users = [],
    onSync
}) {
    const { toast } = useToast();

    // ── Current Week State ──────────────────────────────────────────────
    const [currentWeek, setCurrentWeek] = useState(() => new Date());
    const [entries, setEntries] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittingWeek, setSubmittingWeek] = useState(false);

    // ── Cell Editing & Auto-Save States ──────────────────────────────────
    const [localValues, setLocalValues] = useState({});
    const [savingStates, setSavingStates] = useState({});
    const [cellErrors, setCellErrors] = useState({});
    const debounceTimersRef = useRef({});
    const saveCellRef = useRef();

    // ── Add Row Modal State ─────────────────────────────────────────────
    const [isAddRowOpen, setIsAddRowOpen] = useState(false);
    const [addedRows, setAddedRows] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedTask, setSelectedTask] = useState('');
    const [projectTasks, setProjectTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // ── Target User calculation (if admin viewing another user) ───────────
    const isOrgAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    const targetUserId = useMemo(() => {
        if (isOrgAdmin && selectedMemberFilter && selectedMemberFilter !== 'all') {
            return selectedMemberFilter;
        }
        return user?.id;
    }, [isOrgAdmin, selectedMemberFilter, user?.id]);

    const targetUserObj = useMemo(() => {
        if (targetUserId === user?.id) return user;
        return users.find(u => u.id === targetUserId);
    }, [targetUserId, user, users]);

    // ── Week Dates Calculation (Monday to Sunday) ────────────────────────
    const weekStart = useMemo(() => {
        return startOfWeek(currentWeek, { weekStartsOn: 1 });
    }, [currentWeek]);

    const weekEnd = useMemo(() => {
        return endOfWeek(currentWeek, { weekStartsOn: 1 });
    }, [currentWeek]);

    const daysOfWeek = useMemo(() => {
        return [0, 1, 2, 3, 4, 5, 6].map(i => {
            const date = addDays(weekStart, i);
            return {
                date,
                dateStr: format(date, 'yyyy-MM-dd'),
                dayName: format(date, 'EEE'),
                dayMonth: format(date, 'd MMM'),
                isToday: isSameDay(date, new Date()),
                isWeekend: i >= 5
            };
        });
    }, [weekStart]);

    const isCurrentWeekActive = useMemo(() => {
        return isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 });
    }, [currentWeek]);

    // Target shift hours calculation
    const targetDailyHours = useMemo(() => {
        if (!orgShiftSettings?.startTime || !orgShiftSettings?.endTime) return 8;
        const calc = calculateCustomHours(orgShiftSettings.startTime, orgShiftSettings.endTime);
        const breakHrs = parseFloat(orgShiftSettings.breakHours || 0) || 0;
        return Math.max(1, calc.total - breakHrs);
    }, [orgShiftSettings]);

    // ── Fetch Projects ──────────────────────────────────────────────────
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setProjects(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch projects:', err);
            }
        };
        fetchProjects();
    }, []);

    // ── Fetch Timesheet Entries for Week ─────────────────────────────────
    const fetchWeekEntries = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const startD = new Date(weekStart);
            startD.setHours(0, 0, 0, 0);
            const endD = new Date(weekEnd);
            endD.setHours(23, 59, 59, 999);

            const params = {
                startDate: startD.toISOString(),
                endDate: endD.toISOString()
            };
            if (isOrgAdmin && selectedMemberFilter && selectedMemberFilter !== 'all') {
                params.userId = selectedMemberFilter;
            } else if (!isOrgAdmin) {
                params.userId = targetUserId;
            }

            const res = await api.get('/timesheets', { params });
            const data = res.data.entries || res.data.data || res.data || [];
            setEntries(Array.isArray(data) ? data : []);
            // Clear local values and errors on week switch
            setLocalValues({});
            setCellErrors({});
            setSavingStates({});
        } catch (err) {
            console.error('Failed to fetch timesheet entries:', err);
            toast({
                title: 'Error loading timesheets',
                description: err.response?.data?.error || 'Failed to retrieve week data',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [weekStart, weekEnd, targetUserId, isOrgAdmin, selectedMemberFilter, toast]);

    useEffect(() => {
        fetchWeekEntries();
    }, [fetchWeekEntries]);

    // ── Fetch Tasks when Project is Selected in Add Row Dialog ──────────
    useEffect(() => {
        if (!selectedProject) {
            setProjectTasks([]);
            return;
        }
        const fetchTasks = async () => {
            setLoadingTasks(true);
            try {
                const params = { projectId: selectedProject };
                if (user?.role === 'MEMBER') {
                    params.assignedTo = user.id;
                }
                const res = await api.get('/tasks', { params });
                const tasksData = Array.isArray(res.data) ? res.data : [];
                // Filter out completed and cancelled tasks
                const activeTasks = tasksData.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
                setProjectTasks(activeTasks);
            } catch (err) {
                console.error('Failed to load tasks:', err);
                setProjectTasks([]);
            } finally {
                setLoadingTasks(false);
            }
        };
        fetchTasks();
    }, [selectedProject, user?.id, user?.role]);

    // ── Helper: Extract Leave Type ───────────────────────────────────────
    const getLeaveType = (entry) => {
        const desc = entry.description || '';
        const match = desc.match(/\[(Sick Leave|Casual Leave|Paid Leave|Unpaid Leave)\]/i);
        if (match) return match[1];
        if (entry.project?.name === 'Leave Tracker') return 'Leave';
        return null;
    };

    // ── Build Rows ──────────────────────────────────────────────────────
    const rows = useMemo(() => {
        const regularRowMap = new Map();
        const leaveRowMap = new Map();

        // 1. Process existing entries
        entries.forEach(entry => {
            const leaveType = getLeaveType(entry);
            if (leaveType) {
                const rowKey = `leave__${leaveType}`;
                if (!leaveRowMap.has(rowKey)) {
                    leaveRowMap.set(rowKey, {
                        rowKey,
                        isLeave: true,
                        leaveType,
                        projectName: 'Leave Tracker',
                        taskTitle: leaveType
                    });
                }
            } else if (entry.projectId && entry.taskId) {
                const rowKey = `${entry.projectId}__${entry.taskId}`;
                if (!regularRowMap.has(rowKey)) {
                    regularRowMap.set(rowKey, {
                        rowKey,
                        isLeave: false,
                        projectId: entry.projectId,
                        projectName: entry.project?.name || 'Unknown Project',
                        taskId: entry.taskId,
                        taskTitle: entry.task?.title || 'Unknown Task',
                        taskShortId: entry.task?.shortId || null,
                        isManuallyAdded: false
                    });
                }
            }
        });

        // 2. Add locally added rows that don't have entries yet
        addedRows.forEach(ar => {
            const rowKey = `${ar.projectId}__${ar.taskId}`;
            if (!regularRowMap.has(rowKey)) {
                regularRowMap.set(rowKey, {
                    rowKey,
                    isLeave: false,
                    projectId: ar.projectId,
                    projectName: ar.projectName,
                    taskId: ar.taskId,
                    taskTitle: ar.taskTitle,
                    taskShortId: ar.taskShortId || null,
                    isManuallyAdded: true
                });
            }
        });

        const regularList = Array.from(regularRowMap.values());
        const leaveList = Array.from(leaveRowMap.values());

        return [...regularList, ...leaveList];
    }, [entries, addedRows]);

    // ── Cell Entries Lookup ─────────────────────────────────────────────
    const getEntriesForCell = useCallback((row, dateStr) => {
        if (row.isLeave) {
            return entries.filter(e => {
                const eDateStr = format(parseISO(e.date), 'yyyy-MM-dd');
                if (eDateStr !== dateStr) return false;
                const lt = getLeaveType(e);
                return lt === row.leaveType;
            });
        }
        return entries.filter(e => {
            if (e.projectId !== row.projectId || e.taskId !== row.taskId) return false;
            const eDateStr = format(parseISO(e.date), 'yyyy-MM-dd');
            return eDateStr === dateStr;
        });
    }, [entries]);

    // ── Validation Engine ───────────────────────────────────────────────
    const validateCellInput = useCallback((row, dateStr, valueStr) => {
        const trimmed = valueStr.trim();
        if (trimmed === '') return { valid: true };

        const num = parseFloat(trimmed);
        if (isNaN(num)) {
            return { valid: false, error: 'Hours must be a valid number' };
        }
        if (num <= 0) {
            return { valid: false, error: 'Hours must be greater than 0' };
        }
        if (num > 24) {
            return { valid: false, error: 'Hours cannot exceed 24 in a single entry' };
        }

        // Project Status & Date Boundaries Check
        const project = projects.find(p => p.id === row.projectId);
        const cellDate = parseISO(dateStr);

        if (project?.status === 'COMPLETED' || project?.status === 'ARCHIVED') {
            return {
                valid: false,
                error: `Cannot log hours on a ${project.status.toLowerCase()} project`
            };
        }

        if (project?.startDate) {
            const pStart = startOfDay(parseISO(project.startDate));
            if (isBefore(cellDate, pStart)) {
                return {
                    valid: false,
                    error: `Cannot log hours before project start date (${format(pStart, 'dd MMM yyyy')})`
                };
            }
        }
        // Only enforce project endDate if the project is marked non-active/closed
        if (project?.endDate && project?.status && project.status !== 'ACTIVE') {
            const pEnd = endOfDay(parseISO(project.endDate));
            if (isAfter(cellDate, pEnd)) {
                return {
                    valid: false,
                    error: `Cannot log hours after project end date (${format(pEnd, 'dd MMM yyyy')})`
                };
            }
        }

        // Future Date Limitation (allow up to 24-hour buffer for timezones)
        const now = new Date();
        const futureBuffer = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (cellDate > futureBuffer) {
            return {
                valid: false,
                error: 'Cannot log work hours for future dates'
            };
        }

        // 24-Hour Daily Limit across all entries for this user
        const cellEntries = getEntriesForCell(row, dateStr);
        const editingEntryId = cellEntries.length === 1 ? cellEntries[0].id : null;

        const otherHoursForDay = entries
            .filter(e => {
                if (editingEntryId && e.id === editingEntryId) return false;
                const eDateStr = format(parseISO(e.date), 'yyyy-MM-dd');
                return eDateStr === dateStr;
            })
            .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

        if (otherHoursForDay + num > 24) {
            return {
                valid: false,
                error: `Daily total cannot exceed 24 hours. Currently logged: ${otherHoursForDay.toFixed(1)}h, attempting: ${num}h (Total: ${(otherHoursForDay + num).toFixed(1)}h)`
            };
        }

        return { valid: true, hours: num };
    }, [projects, entries, getEntriesForCell]);

    // ── Auto-Save Execution ─────────────────────────────────────────────
    const performSave = useCallback(async (row, dateStr, rawVal) => {
        const cellKey = `${row.rowKey}__${dateStr}`;
        const cellEntries = getEntriesForCell(row, dateStr);
        const existingEntry = cellEntries.length === 1 ? cellEntries[0] : null;

        const trimmed = (rawVal ?? '').toString().trim();
        const num = parseFloat(trimmed);

        // If unchanged, clear any lingering error and do nothing
        if (existingEntry && !isNaN(num) && Math.abs(parseFloat(existingEntry.hours) - num) < 0.001) {
            setCellErrors(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
            setSavingStates(prev => {
                const next = { ...prev };
                if (next[cellKey] === 'error') delete next[cellKey];
                return next;
            });
            return;
        }
        if (!existingEntry && (trimmed === '' || num === 0)) {
            setCellErrors(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
            setSavingStates(prev => {
                const next = { ...prev };
                if (next[cellKey] === 'error') delete next[cellKey];
                return next;
            });
            return;
        }

        // Deletion: user cleared cell or set to 0
        if (existingEntry && (trimmed === '' || num === 0)) {
            setSavingStates(prev => ({ ...prev, [cellKey]: 'saving' }));
            try {
                await api.delete(`/timesheets/${existingEntry.id}`);
                setEntries(prev => prev.filter(e => e.id !== existingEntry.id));
                setLocalValues(prev => {
                    const next = { ...prev };
                    delete next[cellKey];
                    return next;
                });
                setCellErrors(prev => {
                    const next = { ...prev };
                    delete next[cellKey];
                    return next;
                });
                setSavingStates(prev => ({ ...prev, [cellKey]: 'saved' }));
                setTimeout(() => {
                    setSavingStates(prev => {
                        const next = { ...prev };
                        if (next[cellKey] === 'saved') delete next[cellKey];
                        return next;
                    });
                }, 2500);
                if (onSync) onSync();
            } catch (err) {
                console.error('Failed to remove entry:', err);
                const msg = err.response?.data?.error || 'Failed to remove entry';
                setSavingStates(prev => ({ ...prev, [cellKey]: 'error' }));
                setCellErrors(prev => ({ ...prev, [cellKey]: msg }));
                toast({
                    title: 'Error removing entry',
                    description: msg,
                    variant: 'destructive'
                });
            }
            return;
        }

        // Run validation
        const valResult = validateCellInput(row, dateStr, trimmed);
        if (!valResult.valid) {
            setSavingStates(prev => ({ ...prev, [cellKey]: 'error' }));
            setCellErrors(prev => ({ ...prev, [cellKey]: valResult.error }));
            toast({
                title: 'Invalid Hours',
                description: valResult.error,
                variant: 'destructive'
            });
            return;
        }

        // Clear cell error
        setCellErrors(prev => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
        });

        setSavingStates(prev => ({ ...prev, [cellKey]: 'saving' }));

        try {
            if (existingEntry) {
                const res = await api.put(`/timesheets/${existingEntry.id}`, { hours: valResult.hours });
                const updated = res.data;
                setEntries(prev => prev.map(e => (e.id === existingEntry.id ? { ...e, ...updated, hours: valResult.hours } : e)));
            } else {
                const payload = {
                    projectId: row.projectId,
                    taskId: row.taskId,
                    date: dateStr,
                    hours: valResult.hours,
                    description: 'Logged via weekly timesheet grid',
                    billable: false
                };
                const res = await api.post('/timesheets', payload);
                const created = res.data;
                setEntries(prev => [...prev, created]);
            }

            setSavingStates(prev => ({ ...prev, [cellKey]: 'saved' }));
            setTimeout(() => {
                setSavingStates(prev => {
                    const next = { ...prev };
                    if (next[cellKey] === 'saved') delete next[cellKey];
                    return next;
                });
            }, 2500);

            if (onSync) onSync();
        } catch (err) {
            console.error('Failed to save timesheet entry:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save hours';
            setSavingStates(prev => ({ ...prev, [cellKey]: 'error' }));
            setCellErrors(prev => ({ ...prev, [cellKey]: msg }));
            toast({
                title: 'Save Failed',
                description: msg,
                variant: 'destructive'
            });
        }
    }, [getEntriesForCell, validateCellInput, toast, onSync]);

    saveCellRef.current = performSave;

    // ── Handle Input Change (Debounced Auto-Save) ───────────────────────
    const handleCellChange = (row, dateStr, val) => {
        const cellKey = `${row.rowKey}__${dateStr}`;
        setLocalValues(prev => ({ ...prev, [cellKey]: val }));
        setCellErrors(prev => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
        });
        setSavingStates(prev => {
            const next = { ...prev };
            if (next[cellKey] === 'error') delete next[cellKey];
            return next;
        });

        if (debounceTimersRef.current[cellKey]) {
            clearTimeout(debounceTimersRef.current[cellKey]);
        }

        debounceTimersRef.current[cellKey] = setTimeout(() => {
            if (saveCellRef.current) {
                saveCellRef.current(row, dateStr, val);
            }
        }, 1200);
    };

    // ── Handle Cell Blur (Immediate Save) ───────────────────────────────
    const handleCellBlur = (row, dateStr, val) => {
        const cellKey = `${row.rowKey}__${dateStr}`;
        if (debounceTimersRef.current[cellKey]) {
            clearTimeout(debounceTimersRef.current[cellKey]);
            delete debounceTimersRef.current[cellKey];
        }
        if (saveCellRef.current) {
            saveCellRef.current(row, dateStr, val);
        }
    };

    // ── Row Total Calculation ───────────────────────────────────────────
    const getRowTotal = useCallback((row) => {
        let total = 0;
        daysOfWeek.forEach(day => {
            const dateStr = day.dateStr;
            const cellKey = `${row.rowKey}__${dateStr}`;

            if (localValues[cellKey] !== undefined && !cellErrors[cellKey]) {
                const val = parseFloat(localValues[cellKey]);
                total += isNaN(val) ? 0 : val;
            } else {
                const cellEntries = getEntriesForCell(row, dateStr);
                const sum = cellEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                total += sum;
            }
        });
        return total;
    }, [daysOfWeek, localValues, cellErrors, getEntriesForCell]);

    // ── Daily Column Totals Calculation ─────────────────────────────────
    const dailyTotals = useMemo(() => {
        return daysOfWeek.map(day => {
            const dateStr = day.dateStr;
            let dayTotal = 0;

            rows.forEach(row => {
                const cellKey = `${row.rowKey}__${dateStr}`;
                if (localValues[cellKey] !== undefined && !cellErrors[cellKey]) {
                    const val = parseFloat(localValues[cellKey]);
                    dayTotal += isNaN(val) ? 0 : val;
                } else {
                    const cellEntries = getEntriesForCell(row, dateStr);
                    dayTotal += cellEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                }
            });

            return {
                ...day,
                total: dayTotal,
                exceeds24: dayTotal > 24
            };
        });
    }, [daysOfWeek, rows, localValues, cellErrors, getEntriesForCell]);

    // ── Grand Weekly Total ──────────────────────────────────────────────
    const weeklyGrandTotal = useMemo(() => {
        return dailyTotals.reduce((sum, d) => sum + d.total, 0);
    }, [dailyTotals]);

    // ── Pending Entries Count (for Week Submit) ─────────────────────────
    const pendingEntriesCount = useMemo(() => {
        return entries.filter(e => e.userId === targetUserId && e.status === 'PENDING').length;
    }, [entries, targetUserId]);

    // ── Global Status State ─────────────────────────────────────────────
    const hasSaving = Object.values(savingStates).some(s => s === 'saving');
    const hasError = Object.keys(cellErrors).length > 0 || Object.values(savingStates).some(s => s === 'error');

    const activeErrorMessage = useMemo(() => {
        const errors = Object.values(cellErrors).filter(Boolean);
        if (errors.length > 0) return errors[0];
        return 'Validation error occurred';
    }, [cellErrors]);

    const clearAllErrors = useCallback(() => {
        setCellErrors({});
        setSavingStates(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
                if (next[k] === 'error') delete next[k];
            });
            return next;
        });
    }, []);

    // ── Week Navigation Handlers ────────────────────────────────────────
    const handlePrevWeek = () => {
        setCurrentWeek(prev => subWeeks(prev, 1));
    };

    const handleNextWeek = () => {
        setCurrentWeek(prev => addWeeks(prev, 1));
    };

    const handleCurrentWeek = () => {
        setCurrentWeek(new Date());
    };

    // ── Add Row Confirm ─────────────────────────────────────────────────
    const handleConfirmAddRow = () => {
        if (!selectedProject || !selectedTask) {
            toast({
                title: 'Selection Required',
                description: 'Please choose both a project and a task',
                variant: 'destructive'
            });
            return;
        }

        const project = projects.find(p => p.id === selectedProject);
        const task = projectTasks.find(t => t.id === selectedTask);

        const rowKey = `${selectedProject}__${selectedTask}`;
        const alreadyExists = rows.some(r => r.rowKey === rowKey);

        if (alreadyExists) {
            toast({
                title: 'Row Already Exists',
                description: 'This task is already present in your weekly grid'
            });
            setIsAddRowOpen(false);
            return;
        }

        setAddedRows(prev => [
            ...prev,
            {
                projectId: selectedProject,
                projectName: project?.name || 'Project',
                taskId: selectedTask,
                taskTitle: task?.title || 'Task',
                taskShortId: task?.shortId || null,
                projectStartDate: project?.startDate,
                projectEndDate: project?.endDate
            }
        ]);

        setSelectedProject('');
        setSelectedTask('');
        setIsAddRowOpen(false);
        toast({
            title: 'Task Row Added',
            description: 'You can now enter your hours for this task across the week.'
        });
    };

    // ── Remove Empty Added Row ──────────────────────────────────────────
    const handleRemoveAddedRow = (rowKey) => {
        setAddedRows(prev => prev.filter(ar => `${ar.projectId}__${ar.taskId}` !== rowKey));
    };

    // ── Submit Weekly Timesheet ─────────────────────────────────────────
    const handleSubmitWeeklyTimesheet = async () => {
        if (pendingEntriesCount === 0) return;
        setSubmittingWeek(true);
        try {
            const startD = new Date(weekStart);
            startD.setHours(0, 0, 0, 0);
            const endD = new Date(weekEnd);
            endD.setHours(23, 59, 59, 999);

            await api.post('/timesheets/submit', {
                startDate: startD.toISOString(),
                endDate: endD.toISOString()
            });

            toast({
                title: 'Timesheet Submitted',
                description: 'All pending entries for this week have been submitted for review.'
            });

            await fetchWeekEntries();
            if (onSync) onSync();
        } catch (err) {
            console.error('Failed to submit weekly timesheet:', err);
            toast({
                title: 'Submission Failed',
                description: err.response?.data?.error || 'Failed to submit timesheets',
                variant: 'destructive'
            });
        } finally {
            setSubmittingWeek(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* ── Admin Member Context Banner (if viewing another user) ── */}
            {isOrgAdmin && targetUserId !== user?.id && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                            Viewing timesheet for: <strong className="text-primary">{targetUserObj?.name || 'Selected Member'}</strong>
                        </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                        Admin Mode
                    </Badge>
                </div>
            )}

            {/* ── Main Grid Container ── */}
            <Card className="border-border bg-card shadow-xl overflow-hidden rounded-2xl">
                {/* ── Toolbar Header ── */}
                <div className="border-b border-border bg-muted/20 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Week Navigation */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevWeek}
                                className="h-8 w-8 rounded-lg hover:bg-background"
                                title="Previous Week"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={isCurrentWeekActive ? "secondary" : "ghost"}
                                size="sm"
                                onClick={handleCurrentWeek}
                                className={`h-8 px-3 rounded-lg text-xs font-bold ${
                                    isCurrentWeekActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''
                                }`}
                            >
                                This Week
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNextWeek}
                                className="h-8 w-8 rounded-lg hover:bg-background"
                                title="Next Week"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Date Picker Popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-9 px-3 rounded-xl border-border bg-background hover:bg-muted/40 font-bold text-xs flex items-center gap-2"
                                >
                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                    <span>
                                        {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-border bg-card shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={currentWeek}
                                    onSelect={(d) => {
                                        if (d) setCurrentWeek(d);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Save State Status Indicator */}
                        <div className="ml-2 flex items-center">
                            {hasSaving ? (
                                <span className="flex items-center text-xs font-bold text-primary animate-pulse">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Saving changes...
                                </span>
                            ) : hasError ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 max-w-[340px]">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate" title={activeErrorMessage}>{activeErrorMessage}</span>
                                    <button
                                        type="button"
                                        onClick={clearAllErrors}
                                        className="ml-1 hover:text-red-700 font-black text-xs shrink-0 cursor-pointer"
                                        title="Dismiss error"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <span className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                    All changes saved
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions & Weekly Total */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Weekly Grand Total Pill */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl">
                            <Clock className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Weekly Total:</span>
                            <span className="text-sm font-black Montserrat">{weeklyGrandTotal.toFixed(1)}h</span>
                        </div>

                        {/* Add Task Row Button */}
                        <Button
                            onClick={() => setIsAddRowOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-md shadow-primary/20 transition-all active:scale-95"
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Task Row
                        </Button>

                        {/* Submit Weekly Timesheet Button */}
                        {!isOrgAdmin && (
                            <Button
                                onClick={handleSubmitWeeklyTimesheet}
                                disabled={submittingWeek || pendingEntriesCount === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={pendingEntriesCount === 0 ? "No pending entries to submit for this week" : "Submit all pending entries for this week"}
                            >
                                {submittingWeek ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                Submit Timesheet {pendingEntriesCount > 0 && `(${pendingEntriesCount})`}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Responsive Table Grid ── */}
                <div className="overflow-x-auto w-full custom-scrollbar">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                            <p className="font-bold text-xs uppercase tracking-wider">Loading Weekly Timesheet...</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="py-20 px-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                                <Clock className="h-6 w-6" />
                            </div>
                            <h3 className="font-black Montserrat text-base text-foreground mb-1">No Timesheet Rows for this Week</h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                                You don't have any logged hours or tasks assigned for this week yet. Click the button below to add a task row and start entering daily hours.
                            </p>
                            <Button
                                onClick={() => setIsAddRowOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-9 px-5 text-xs shadow-md shadow-primary/20"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Task Row
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-xs min-w-[860px]">
                            {/* ── Table Header ── */}
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    {/* Column 0: Project & Task */}
                                    <th className="p-3 sticky left-0 z-20 bg-card border-r border-border font-black Montserrat text-[11px] uppercase tracking-wider text-muted-foreground min-w-[240px] max-w-[280px]">
                                        Project / Task
                                    </th>

                                    {/* Columns 1–7: Monday to Sunday */}
                                    {daysOfWeek.map(day => (
                                        <th
                                            key={day.dateStr}
                                            className={`p-3 text-center border-r border-border/50 min-w-[82px] transition-colors ${
                                                day.isToday
                                                    ? 'bg-primary/10 text-primary border-primary/30 font-black'
                                                    : 'text-muted-foreground font-bold'
                                            }`}
                                        >
                                            <div className="font-black Montserrat text-xs uppercase tracking-wider">
                                                {day.dayName}
                                            </div>
                                            <div className="text-[10px] font-medium opacity-80 mt-0.5">
                                                {day.dayMonth}
                                            </div>
                                        </th>
                                    ))}

                                    {/* Column 8: Total */}
                                    <th className="p-3 text-center font-black Montserrat text-[11px] uppercase tracking-wider text-muted-foreground min-w-[80px] bg-muted/30">
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            {/* ── Table Body ── */}
                            <tbody className="divide-y divide-border">
                                {rows.map(row => {
                                    const rowTotal = getRowTotal(row);

                                    return (
                                        <tr
                                            key={row.rowKey}
                                            className={`transition-colors hover:bg-muted/10 ${
                                                row.isLeave ? 'bg-blue-500/5' : ''
                                            }`}
                                        >
                                            {/* Column 0: Project & Task Title (Sticky Left) */}
                                            <td className="p-3 sticky left-0 z-10 bg-card border-r border-border min-w-[240px] max-w-[280px]">
                                                {row.isLeave ? (
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                                                    Leave Tracker
                                                                </Badge>
                                                            </div>
                                                            <div className="font-black text-xs text-foreground">
                                                                🌴 {row.leaveType}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted-foreground" title="Formal leave entries are logged via Leave Tracker and shown here as read-only.">
                                                            Read-only
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between group">
                                                        <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground truncate">
                                                                <FolderKanban className="h-3 w-3 text-primary shrink-0" />
                                                                <span className="truncate">{row.projectName}</span>
                                                            </div>
                                                            <div className="font-bold text-xs text-foreground truncate" title={row.taskTitle}>
                                                                {row.taskShortId && (
                                                                    <span className="text-primary font-black mr-1">
                                                                        [{row.taskShortId}]
                                                                    </span>
                                                                )}
                                                                {row.taskTitle}
                                                            </div>
                                                        </div>

                                                        {/* Option to delete newly added local row if 0 hours */}
                                                        {row.isManuallyAdded && rowTotal === 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveAddedRow(row.rowKey)}
                                                                className="h-6 w-6 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                                                                title="Remove unlogged row"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Columns 1–7: Days Inputs / Cells */}
                                            {daysOfWeek.map(day => {
                                                const dateStr = day.dateStr;
                                                const cellKey = `${row.rowKey}__${dateStr}`;
                                                const cellEntries = getEntriesForCell(row, dateStr);
                                                const savingState = savingStates[cellKey];
                                                const cellError = cellErrors[cellKey];

                                                // 1. Leave Row Cell
                                                if (row.isLeave) {
                                                    const leaveSum = cellEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                                                    return (
                                                        <td key={dateStr} className="p-2 border-r border-border/50 text-center">
                                                            {leaveSum > 0 ? (
                                                                <div
                                                                    className="h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shadow-xs"
                                                                    title={`[${row.leaveType}] ${leaveSum}h logged in Leave Tracker`}
                                                                >
                                                                    {leaveSum.toFixed(1)}h
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/30 font-bold">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                }

                                                // 2. Multiple Entries Cell (read-only sum)
                                                if (cellEntries.length > 1) {
                                                    const multiSum = cellEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
                                                    return (
                                                        <td key={dateStr} className="p-2 border-r border-border/50 text-center">
                                                            <div
                                                                className="h-10 rounded-xl bg-muted/40 border border-border text-foreground font-black text-xs flex items-center justify-center cursor-help shadow-xs"
                                                                title={`Multiple entries (${cellEntries.length}) logged on this date. Please manage individual entries in List view.`}
                                                            >
                                                                {multiSum.toFixed(1)}h
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                // 3. Single Entry or Empty Cell
                                                const existingEntry = cellEntries[0] || null;
                                                const isApproved = existingEntry?.status === 'APPROVED';
                                                const isRejected = existingEntry?.status === 'REJECTED';

                                                // If Approved, show locked read-only chip
                                                if (isApproved) {
                                                    return (
                                                        <td key={dateStr} className="p-2 border-r border-border/50 text-center">
                                                            <div
                                                                className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center gap-1 shadow-xs"
                                                                title="Approved by manager"
                                                            >
                                                                <Lock className="h-3 w-3 shrink-0" />
                                                                <span>{parseFloat(existingEntry.hours).toFixed(1)}h</span>
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                // Value for input: local value if edited, else existing entry hours, else empty
                                                const displayValue = localValues[cellKey] !== undefined
                                                    ? localValues[cellKey]
                                                    : existingEntry
                                                    ? existingEntry.hours
                                                    : '';

                                                return (
                                                    <td key={dateStr} className="p-2 border-r border-border/50 text-center">
                                                        <div className="relative flex items-center justify-center">
                                                            <Input
                                                                type="number"
                                                                step="0.25"
                                                                min="0"
                                                                max="24"
                                                                value={displayValue}
                                                                onChange={(e) => handleCellChange(row, dateStr, e.target.value)}
                                                                onBlur={(e) => handleCellBlur(row, dateStr, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') e.target.blur();
                                                                }}
                                                                placeholder="-"
                                                                className={`h-10 text-center font-bold text-xs rounded-xl transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                                    cellError
                                                                        ? 'border-red-500 bg-red-500/10 text-red-600 focus-visible:ring-red-500'
                                                                        : isRejected
                                                                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                                                                        : savingState === 'saved'
                                                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700'
                                                                        : 'bg-muted/20 border-border hover:bg-muted/40 focus:bg-background'
                                                                }`}
                                                                title={cellError || (isRejected ? `Rejected: ${existingEntry?.rejectionReason || 'Please revise and re-enter'}` : undefined)}
                                                            />

                                                            {/* In-Cell Status Indicators */}
                                                            {savingState === 'saving' && (
                                                                <Loader2 className="absolute right-2 top-3 h-3.5 w-3.5 animate-spin text-primary pointer-events-none" />
                                                            )}
                                                            {savingState === 'saved' && (
                                                                <Check className="absolute right-2 top-3 h-3.5 w-3.5 text-emerald-600 pointer-events-none" />
                                                            )}
                                                            {cellError && (
                                                                <div className="absolute right-2 top-3 text-red-500 cursor-pointer" title={cellError}>
                                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* Column 8: Row Total */}
                                            <td className="p-3 text-center font-black Montserrat text-xs text-foreground bg-muted/20">
                                                {rowTotal > 0 ? `${rowTotal.toFixed(1)}h` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* ── Table Footer (Daily Totals) ── */}
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/30">
                                    {/* Column 0: Total Label */}
                                    <td className="p-3 sticky left-0 z-20 bg-card border-r border-border min-w-[240px] max-w-[280px]">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-black Montserrat text-xs uppercase tracking-wider text-foreground">
                                                    Daily Total
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                                                    Target: {targetDailyHours.toFixed(1)}h / day
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold bg-muted/40">
                                                Sum
                                            </Badge>
                                        </div>
                                    </td>

                                    {/* Columns 1–7: Daily Totals */}
                                    {dailyTotals.map(dt => {
                                        const isTargetMet = dt.total >= targetDailyHours;

                                        return (
                                            <td key={dt.dateStr} className="p-2 border-r border-border/50 text-center">
                                                {dt.total === 0 ? (
                                                    <span className="text-muted-foreground/40 font-bold text-xs">0.0h</span>
                                                ) : dt.exceeds24 ? (
                                                    <div
                                                        className="py-1 px-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 font-black text-xs"
                                                        title="Daily total exceeds 24-hour limit!"
                                                    >
                                                        {dt.total.toFixed(1)}h ⚠️
                                                    </div>
                                                ) : isTargetMet ? (
                                                    <div
                                                        className="py-1 px-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs"
                                                        title="Target shift hours reached"
                                                    >
                                                        ✓ {dt.total.toFixed(1)}h
                                                    </div>
                                                ) : (
                                                    <div className="font-black text-xs text-foreground">
                                                        {dt.total.toFixed(1)}h
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* Column 8: Grand Weekly Total */}
                                    <td className="p-3 text-center bg-muted/40">
                                        <div className="font-black Montserrat text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl py-1 px-2 text-center shadow-xs">
                                            {weeklyGrandTotal.toFixed(1)}h
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </Card>

            {/* ── Add Project / Task Row Dialog ── */}
            <Dialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen}>
                <DialogContent className="bg-card border-border shadow-2xl rounded-2xl w-[95vw] max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black Montserrat">Add Task Row to Grid</DialogTitle>
                        <DialogDescription className="text-xs font-medium text-muted-foreground">
                            Select a project and task to add a new row to your weekly grid. You can then quickly log daily hours.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Select Project */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Project
                            </Label>
                            <SearchableSelect
                                value={selectedProject}
                                onChange={(val) => {
                                    setSelectedProject(val);
                                    setSelectedTask('');
                                }}
                                options={projects
                                    .filter(p => p.name !== 'Leave Tracker')
                                    .map(p => ({
                                        label: p.name,
                                        value: p.id
                                    }))
                                }
                                placeholder="Choose a project..."
                                searchPlaceholder="Search projects..."
                                emptyMessage="No projects found"
                                className="bg-muted/30 border-border h-11 rounded-xl font-bold"
                            />
                        </div>

                        {/* Select Task */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Task
                                </Label>
                                {loadingTasks && (
                                    <span className="text-[10px] text-primary flex items-center">
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading tasks...
                                    </span>
                                )}
                            </div>
                            <SearchableSelect
                                value={selectedTask}
                                onChange={(val) => setSelectedTask(val)}
                                disabled={!selectedProject || loadingTasks}
                                options={projectTasks.map(t => ({
                                    label: t.shortId ? `[${t.shortId}] ${t.title}` : t.title,
                                    value: t.id
                                }))}
                                placeholder={
                                    !selectedProject
                                        ? "Select a project first"
                                        : projectTasks.length === 0
                                        ? "No active tasks in this project"
                                        : "Choose a task..."
                                }
                                searchPlaceholder="Search tasks..."
                                emptyMessage="No tasks found"
                                className="bg-muted/30 border-border h-11 rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedProject('');
                                setSelectedTask('');
                                setIsAddRowOpen(false);
                            }}
                            className="rounded-xl font-bold h-10 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAddRow}
                            disabled={!selectedProject || !selectedTask}
                            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-6 shadow-md shadow-primary/20"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Add to Grid
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
