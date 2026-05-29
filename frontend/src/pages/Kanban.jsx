import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { RefreshCw, Plus, X, MoreVertical, Clock, AlertCircle, User, ClipboardList, Filter, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteConfirmDialog from '@/components/ui/delete-confirm-dialog';

// ─── Status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  TODO: {
    label: 'To Do',
    color: '#F59E0B', // Vibrant Amber
    dot: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    badgeText: '#FBBF24',
    progress: 0,
    bgTint: 'rgba(245, 158, 11, 0.03)',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#00A3FF', // Electric Blue
    dot: '#00A3FF',
    badgeBg: 'rgba(0, 163, 255, 0.1)',
    badgeText: '#7DD3FC',
    progress: 50,
    bgTint: 'rgba(0, 163, 255, 0.03)',
  },
  IN_REVIEW: {
    label: 'In Review',
    color: '#D946EF', // Neon Purple/Magenta
    dot: '#D946EF',
    badgeBg: 'rgba(217, 70, 239, 0.1)',
    badgeText: '#F5D0FE',
    progress: 75,
    bgTint: 'rgba(217, 70, 239, 0.03)',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#48A111', // Neon Green
    dot: '#48A111',
    badgeBg: 'rgba(72, 161, 17, 0.1)',
    badgeText: '#86EFAC',
    progress: 100,
    bgTint: 'rgba(72, 161, 17, 0.03)',
  },
  BLOCKED: {
    label: 'Blocked',
    color: '#EF4444', // Vivid Red
    dot: '#EF4444',
    badgeBg: 'rgba(239, 68, 68, 0.1)',
    badgeText: '#FCA5A5',
    progress: 0,
    bgTint: 'rgba(239, 68, 68, 0.03)',
  },
};

const STATUSES = Object.keys(STATUS_CONFIG);

// ─── Component ──────────────────────────────────────────────────
const Kanban = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', projectId: '',
    assignedTo: '', priority: 'MEDIUM', dueDate: null,
  });
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [rejectTaskId, setRejectTaskId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const projectIdFromUrl = params.get('project');
      const url = projectIdFromUrl ? `/tasks/my-tasks?projectId=${projectIdFromUrl}` : '/tasks/my-tasks';
      const res = await api.get(url);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const r = await api.get('/projects');
      setProjects(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const r = await api.get('/users');
      setUsers(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (status) => {
    if (!formData.title || !formData.projectId) {
      toast({ title: 'Validation Error', description: 'Title and project are required.', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/tasks', {
        ...formData, status,
        assignedTo: formData.assignedTo || undefined,
        dueDate: formData.dueDate ? format(new Date(formData.dueDate), 'yyyy-MM-dd') : undefined,
      });
      setFormData({ title: '', description: '', projectId: '', assignedTo: '', priority: 'MEDIUM', dueDate: null });
      setShowCreateForm(null);
      fetchMyTasks();
      toast({ title: 'Task Created', description: 'Task added successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.45';
    e.currentTarget.style.transform = 'scale(0.97)';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = 'scale(1)';
    setDragOverCol(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedTask || draggedTask.status === newStatus) { setDraggedTask(null); return; }

    if (user?.role === 'MEMBER') {
      if (newStatus === 'COMPLETED') {
        toast({ title: 'Not Allowed', description: 'Members cannot move tasks directly to Completed. Please use In Review.', variant: 'destructive' });
        setDraggedTask(null);
        return;
      }
      if (draggedTask.status === 'COMPLETED') {
        toast({ title: 'Not Allowed', description: 'Tasks that are Completed can only be moved by a Manager.', variant: 'destructive' });
        setDraggedTask(null);
        return;
      }
    }

    try {
      await api.put(`/tasks/${draggedTask.id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t));
    } catch {
      toast({ title: 'Update Failed', description: 'Could not move task.', variant: 'destructive' });
    } finally { setDraggedTask(null); }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast({ title: 'Task Deleted', description: 'The task has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast({ title: 'Status Updated', description: `Task moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleApproveStatus = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/approve-status`);
      toast({ title: 'Status Approved', description: 'The task status change has been approved.' });
      fetchMyTasks();
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to approve status.', variant: 'destructive' });
    }
  };

  const handleRejectStatus = (taskId) => {
    setRejectTaskId(taskId);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const submitRejectionStatus = async () => {
    if (!rejectTaskId) return;
    try {
      await api.post(`/tasks/${rejectTaskId}/reject-status`, { rejectionReason });
      toast({ title: 'Status Rejected', description: 'The task has been reverted to its previous status.' });
      fetchMyTasks();
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to reject status.', variant: 'destructive' });
    } finally {
      setShowRejectDialog(false);
      setRejectTaskId(null);
      setRejectionReason('');
    }
  };

  const getPriorityBadge = (priority) => ({
    LOW: { bg: '#F3F4F6', text: '#6B7280' },
    MEDIUM: { bg: '#EFF6FF', text: '#1D4ED8' },
    HIGH: { bg: '#FFF7ED', text: '#C2410C' },
    URGENT: { bg: '#FEF2F2', text: '#B91C1C' },
  }[priority] || { bg: '#EFF6FF', text: '#1D4ED8' });

  const getDaysUntilDue = (d) => {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / 86400000);
  };

  const isOverdue = (d) => d && new Date(d) < new Date();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex gap-2 items-center text-gray-500 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading board...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="max-w-[1700px] mx-auto px-6 py-6">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Task Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">👤 {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchMyTasks} className="gap-1.5 rounded-xl bg-white border-gray-100 shadow-sm h-9">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start">
          {STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const PRIORITY_ORDER = { URGENT: 0, HIGH: 2, MEDIUM: 3, LOW: 4 };
            const colTasks = tasks.filter(t => t.status === status).sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
            const isOver = dragOverCol === status;

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, status)}
                className={`flex flex-col min-w-[280px] w-full rounded-2xl transition-all duration-300 border border-transparent ${isOver ? 'ring-2 ring-primary/40 glass' : ''}`}
                style={{ backgroundColor: cfg.bgTint, borderColor: isOver ? cfg.color : 'transparent' }}
              >
                {/* ── Column Header ── */}
                <div className="flex items-center justify-between p-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px] animate-pulse" style={{ backgroundColor: cfg.color, boxShadow: `0 0 12px ${cfg.color}` }} />
                    <h2 className="font-black text-xs uppercase tracking-widest text-white Montserrat">
                      {cfg.label}
                    </h2>
                    <Badge variant="secondary" className="bg-white/5 text-gray-400 text-[10px] h-5 rounded-md border-0 Montserrat">
                      {colTasks.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || 
                        (user?.role === 'MEMBER' && projects.some(p => p.allowMemberTaskCreation));
                      return canCreate ? (
                      <button
                        onClick={() => setShowCreateForm(status)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                      >
                        {showCreateForm === status ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                      ) : null;
                    })()}
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Quick Create Form ── */}
                {showCreateForm === status && (
                  <div className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Task title *"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="text-sm h-9 rounded-xl border-gray-100"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        value={formData.projectId}
                        onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                        className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="">Select project *</option>
                        {projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || p.allowMemberTaskCreation).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={formData.assignedTo}
                        onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                        className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="">Assign to (optional)</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                      <div className="flex gap-2">
                        <select
                          value={formData.priority}
                          onChange={e => setFormData({ ...formData, priority: e.target.value })}
                          className="flex-1 text-sm border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <div className="flex-1">
                          <DatePicker
                            date={formData.dueDate}
                            setDate={(date) => setFormData({ ...formData, dueDate: date })}
                            placeholder="Due Date"
                            className="h-9 rounded-xl border-gray-100"
                          />
                        </div>
                      </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        className="flex-1 text-sm font-bold text-white py-2 rounded-xl transition-all hover:shadow-lg active:scale-95"
                        style={{ backgroundColor: cfg.color }}
                        onClick={() => handleCreateTask(status)}
                      >
                        Create Task
                      </button>
                      <button
                        className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                        onClick={() => setShowCreateForm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Task Cards ── */}
                <div className="space-y-4 min-h-[100px] pb-4">
                  {colTasks.length === 0 && (
                    <div
                      className="border-2 border-dashed rounded-2xl py-10 text-center text-xs text-gray-300 font-medium"
                      style={{ borderColor: `${cfg.color}20` }}
                    >
                      Drag & Drop
                    </div>
                  )}

                  {colTasks.map(task => {
                    const priority = getPriorityBadge(task.priority);
                    const daysLeft = getDaysUntilDue(task.dueDate);
                    const overdue = isOverdue(task.dueDate);
                    const progress = task.completionPercentage ?? cfg.progress;

                    // Specific status label and color for the badge on the card
                    const cardCfg = STATUS_CONFIG[task.status] || cfg;
                    const pendingTag = task.tags?.find(t => t.startsWith('PENDING_APPROVAL:'));
                    const isPendingApproval = !!pendingTag;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 p-5 cursor-grab active:cursor-grabbing hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 group select-none relative overflow-hidden ring-1 ring-white/5"
                        style={{ borderLeft: `4px solid ${cardCfg.color}` }}
                      >
                        {/* ── Row 1: Icon Box + Status Label ── */}
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0 transition-transform group-hover:scale-110 duration-300"
                            style={{
                              backgroundColor: `${cardCfg.color}20`,
                              color: cardCfg.color,
                              border: `1px solid ${cardCfg.color}40`
                            }}
                          >
                            <ClipboardList className="w-5 h-5" />
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md text-gray-300 hover:text-foreground transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-card border-border text-foreground">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="cursor-pointer">
                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                    Change Status
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="bg-card border-border text-foreground">
                                    {STATUSES.filter(s => s !== task.status && !(user?.role === 'MEMBER' && s === 'COMPLETED')).map(s => (
                                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(task.id, s)} className="cursor-pointer">
                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                                        {STATUS_CONFIG[s].label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER') && (
                                  <>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive focus:text-destructive cursor-pointer">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Task
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <span
                              className="text-[9px] font-black px-2.5 py-1 rounded-md border shadow-sm tracking-widest uppercase Montserrat"
                              style={{
                                backgroundColor: `${cardCfg.color}15`,
                                color: cardCfg.color,
                                borderColor: `${cardCfg.color}30`,
                                textShadow: `0 0 10px ${cardCfg.color}50`
                              }}
                            >
                              {cardCfg.label}
                            </span>
                          </div>
                        </div>

                        {isPendingApproval && (
                          <div className="flex items-center justify-between mt-2 mb-3 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                              Pending Approval
                            </span>
                            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApproveStatus(task.id); }}
                                  className="p-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors"
                                  title="Approve"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRejectStatus(task.id); }}
                                  className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-white mb-1 line-clamp-2 leading-snug tracking-tight Montserrat">
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <p className="text-[11px] font-semibold text-gray-400 truncate">
                              {task.project?.name || 'No Project'}
                            </p>
                          </div>
                        </div>

                        {/* ── Meta Info (Tasks due soon) ── */}
                        <div className="mb-4">
                          <p className="text-[12px] font-medium text-gray-500">
                            {overdue ? (
                              <span className="text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            ) : daysLeft === 0 ? (
                              <span className="text-amber-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due today
                              </span>
                            ) : daysLeft !== null ? (
                              `6 Tasks due soon` // Hardcoded placeholder like mockup? Or real? Mockup says "6 Tasks due soon"
                            ) : (
                              'No due date'
                            )}
                          </p>
                        </div>

                        {/* ── Progress Section ── */}
                        <div className="mb-5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">Progress</span>
                            <span className="text-[12px] font-black" style={{ color: cardCfg.color }}>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px]"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: cardCfg.color,
                                boxShadow: `0 0 10px ${cardCfg.color}40`
                              }}
                            />
                          </div>
                        </div>

                        {/* ── Footer: Assignee Stack ── */}
                        <div className="flex items-center justify-between pt-2">
                          {/* Avatar Stack */}
                          <div className="flex -space-x-3 items-center">
                            {task.assignees && task.assignees.length > 0 ? (
                              task.assignees.map((as, idx) => (
                                <div
                                  key={as.userId}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-sm ring-1 ring-gray-100 bg-gray-300 relative"
                                  style={{
                                    zIndex: 10 - idx,
                                    backgroundColor: `hsl(${(idx * 137) % 360}, 60%, 50%)`
                                  }}
                                  title={as.user?.name}
                                >
                                  {getInitials(as.user?.name)}
                                </div>
                              ))
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-100">
                                <User className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                            {/* Placeholder for "more" if needed */}
                            {task.assignees && task.assignees.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm text-[9px] font-bold text-gray-400 z-0">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>

                          {/* Priority Indicator */}
                          <Badge
                            variant="none"
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: priority.bg, color: priority.text }}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DeleteConfirmDialog 
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone and will remove it from the board."
      />

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-xl">
            <DialogHeader>
                <DialogTitle className="font-black Montserrat">Provide Rejection Reason</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                    Please explain why this task is being rejected. This will be visible to the assignee.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <textarea
                    className="w-full h-32 p-3 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Enter reason here..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={() => {
                        setShowRejectDialog(false);
                        setRejectTaskId(null);
                        setRejectionReason('');
                    }}
                    className="px-4 py-2 rounded-lg font-bold text-sm bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={submitRejectionStatus}
                    disabled={!rejectionReason.trim()}
                    className="px-4 py-2 rounded-lg font-bold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Reject Task
                </button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kanban;
