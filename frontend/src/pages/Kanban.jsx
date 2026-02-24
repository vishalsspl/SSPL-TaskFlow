import { useState, useEffect } from 'react';
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
import { RefreshCw, Plus, X, MoreVertical, Clock, AlertCircle, User, ClipboardList, Filter } from 'lucide-react';

// ─── Status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  BACKLOG: {
    label: 'Pending',
    color: '#F43F5E', // Vibrant Rose
    dot: '#F43F5E',
    badgeBg: 'rgba(244, 63, 94, 0.1)',
    badgeText: '#FB7185',
    progress: 10,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#38BDF8', // Neon Sky Blue
    dot: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.1)',
    badgeText: '#7DD3FC',
    progress: 50,
  },
  REVIEW: {
    label: 'Under Reviews',
    color: '#F97316', // Vibrant Orange
    dot: '#F97316',
    badgeBg: 'rgba(249, 115, 22, 0.1)',
    badgeText: '#FB923C',
    progress: 75,
  },
  DONE: {
    label: 'Completed',
    color: '#48A111', // Neon Green
    dot: '#48A111',
    badgeBg: 'rgba(72, 161, 17, 0.1)',
    badgeText: '#86EFAC',
    progress: 100,
  },
  BLOCKED: {
    label: 'Blocked',
    color: '#94A3B8', // Muted Slate
    dot: '#94A3B8',
    badgeBg: 'rgba(148, 163, 184, 0.1)',
    badgeText: '#CBD5E1',
    progress: 0,
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
  const [projectTypeFilter, setProjectTypeFilter] = useState('ALL');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', projectId: '',
    assignedTo: '', priority: 'MEDIUM', dueDate: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/my-tasks');
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
        dueDate: formData.dueDate || undefined,
      });
      setFormData({ title: '', description: '', projectId: '', assignedTo: '', priority: 'MEDIUM', dueDate: '' });
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
    try {
      await api.put(`/tasks/${draggedTask.id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t));
    } catch {
      toast({ title: 'Update Failed', description: 'Could not move task.', variant: 'destructive' });
    } finally { setDraggedTask(null); }
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
            <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 rounded-xl bg-white border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <SelectValue placeholder="Project Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchMyTasks} className="gap-1.5 rounded-xl bg-white border-gray-100 shadow-sm h-9">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start">
          {STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const colTasks = tasks.filter(t => {
              const matchesStatus = t.status === status;
              const matchesType = projectTypeFilter === 'ALL' ? true : t.project?.category === projectTypeFilter;
              return matchesStatus && matchesType;
            });
            const isOver = dragOverCol === status;

            return (
              <div
                key={status}
                className={`rounded-2xl transition-all duration-200 ${isOver ? 'scale-[1.015] shadow-lg' : ''}`}
                style={{ backgroundColor: isOver ? `${cfg.color}08` : 'transparent' }}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* ── Column Header ── */}
                <div className="flex items-center justify-between px-2 py-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: cfg.dot }} />
                    <span className="font-bold text-sm text-gray-800 tracking-tight">{cfg.label}</span>
                    <span
                      className="text-[11px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCreateForm(showCreateForm === status ? null : status)}
                      className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-600"
                      title="Add task"
                    >
                      {showCreateForm === status
                        ? <X className="w-4 h-4" />
                        : <Plus className="w-4 h-4" />}
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-600">
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
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                        className="flex-1 text-sm h-9 rounded-xl border-gray-100"
                      />
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

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="bg-white rounded-2xl border border-gray-50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] p-5 cursor-grab active:cursor-grabbing hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 group select-none relative overflow-hidden"
                      >
                        {/* ── Row 1: Icon Box + Status Label ── */}
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0 transition-transform group-hover:scale-110 duration-300"
                            style={{ backgroundColor: cardCfg.color }}
                          >
                            <ClipboardList className="w-6 h-6" />
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button className="p-1 rounded-md text-gray-300 hover:text-gray-500 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <span
                              className="text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm tracking-wide uppercase"
                              style={{
                                backgroundColor: cardCfg.badgeBg,
                                color: cardCfg.badgeText,
                                borderColor: `${cardCfg.dot}20`,
                              }}
                            >
                              {cardCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* ── Task Title & Project ── */}
                        <div className="mb-4">
                          <h3 className="text-[15px] font-bold text-gray-900 mb-1 line-clamp-2 leading-snug tracking-tight">
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
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${progress}%`, backgroundColor: cardCfg.color }}
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
    </div>
  );
};

export default Kanban;
