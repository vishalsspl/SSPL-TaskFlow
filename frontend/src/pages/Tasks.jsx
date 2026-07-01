import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import { DatePicker } from '@/components/ui/date-picker';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, priorityColors, statusColors, taskTypeColors } from '@/lib/utils';
import {
  Plus,
  CheckSquare,
  Layers,
  User,
  Activity,
  AlertCircle,
  Calendar,
  Tag,
  AlignLeft,
  Briefcase,
  Search,
  Filter,
  Trash2,
  Bug,
  Zap,
  BookOpen,
  GitBranch,
  FileSpreadsheet,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import CreateTaskForm from '@/components/forms/CreateTaskForm';
import TablePagination from '@/components/ui/table-pagination';
import { useToast } from "@/hooks/use-toast";

import { Edit2, Lock, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImportTasksDialog from '@/components/ImportTasksDialog';
import TaskDetailsModal from '@/components/task/TaskDetailsModal';

const PROJECT_COLORS = [
  '#48A111', // SSPL Green
  '#00A3FF', // Sky Blue
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#D946EF', // Fuchsia
  '#10B981', // Emerald
];

const getProjectColor = (projectId, projects = []) => {
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) return '#111113'; // Default dark
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
};

const getContrastColor = (hexColor) => {
  if (!hexColor || hexColor === '#111113') return '#FFFFFF';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const getTaskProgress = (task) => {
  if (task.status === 'COMPLETED') return 100;
  if (task.completionPercentage > 0) return task.completionPercentage;
  if (task.status === 'IN_REVIEW') return 75;
  if (task.status === 'IN_PROGRESS') return 50;
  return 0;
};

const Tasks = () => {
  const { user } = useAuthStore();
  const { setHeader, searchTerm: globalSearch, setSearchTerm: setGlobalSearch } = useHeaderStore();
  const { toast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [phases, setPhases] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Mobile filters toggle
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  // Advanced Filters State
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [dueDateFrom, setDueDateFrom] = useState(null);
  const [dueDateTo, setDueDateTo] = useState(null);
  const [pointsMin, setPointsMin] = useState('');
  const [pointsMax, setPointsMax] = useState('');
  const [progressFilter, setProgressFilter] = useState('');

  const canCreateTaskGlobal = user?.role === 'ADMIN' || user?.permissions?.['tasks.create'] || (user?.role === 'MEMBER' && projects.some(p => p.allowMemberTaskCreation));
  const canImport = user?.role === 'ADMIN' || user?.permissions?.['reports.import'];

  // Debounce global search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  useEffect(() => {
    setHeader("Tasks", "View and manage tasks across all projects", true, "Search tasks...");
    // Clear search when leaving tasks page? 
    // Maybe better to keep it if they return, but for now we just want to show it.
    return () => {
      // We could clear search here if we wanted: setGlobalSearch('');
    };
  }, [setHeader]);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filter, projectFilter, priorityFilter, typeFilter, page, pageSize, debouncedSearch, sortBy, sortOrder, selectedProjectIds, selectedAssigneeIds, selectedStatuses, selectedTypes, selectedPriorities, dueDateFrom, dueDateTo, pointsMin, pointsMax, progressFilter]);

  const fetchTasks = async () => {
    try {
      const params = { page, limit: pageSize, sortBy, sortOrder };
      
      if (selectedProjectIds.length > 0) params.projectId = selectedProjectIds.join(',');
      else if (projectFilter !== 'all') params.projectId = projectFilter;

      if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
      else if (filter !== 'all') params.status = filter;

      if (selectedPriorities.length > 0) params.priority = selectedPriorities.join(',');
      else if (priorityFilter) params.priority = priorityFilter;

      if (selectedTypes.length > 0) params.type = selectedTypes.join(',');
      else if (typeFilter) params.type = typeFilter;

      if (selectedAssigneeIds.length > 0) params.assignedTo = selectedAssigneeIds.join(',');
      else if (user?.role === 'MEMBER') params.assignedTo = user.id;

      if (debouncedSearch) params.search = debouncedSearch;

      if (dueDateFrom) params.dueDateFrom = dueDateFrom.toISOString();
      if (dueDateTo) params.dueDateTo = dueDateTo.toISOString();
      if (pointsMin !== '') params.pointsMin = pointsMin;
      if (pointsMax !== '') params.pointsMax = pointsMax;
      if (progressFilter !== '' && progressFilter !== 'all') {
         params.progressMin = progressFilter;
         params.progressMax = progressFilter;
      }

      const response = await api.get('/tasks', { params });
      setTasks(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline-block" /> : <ArrowDown className="w-3 h-3 ml-1 inline-block" />;
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { teamOnly: 'true' } });
      // Filter out CLIENT role users - only show team members for task assignment
      const teamMembers = response.data.filter(user => user.role !== 'CLIENT');
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // handleProjectChange no longer needed in parent


  const handleTaskCreated = () => {
    setShowCreateDialog(false);
    fetchTasks();
  };

  const handleTaskClick = (task) => {
    if (user?.role === 'CLIENT') return;
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const handleDelete = (task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      toast({
        title: "Task Deleted",
        description: `Task "${taskToDelete.title}" has been removed.`,
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.error || "Failed to delete task.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  const handleTaskUpdated = () => {
    setShowEditDialog(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const handleProgressUpdate = async (taskId, newPercentage) => {
    try {
      await api.patch(`/tasks/${taskId}/progress`, { completionPercentage: newPercentage });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Build a lookup: projectId → manager info (from the projects list we already fetch)
  const projectManagerMap = new Map(
    projects.filter(p => p.manager).map(p => [p.id, p.manager])
  );

  // Derive unique managers from projects
  const managerOptions = [
    { value: '', label: 'All Managers' },
    ...Array.from(
      new Map(
        projects
          .filter(p => p.manager)
          .filter(p => projectFilter !== 'all' ? p.id === projectFilter : true)
          .map(p => [p.manager.id, { value: p.manager.id, label: p.manager.name }])
      ).values()
    ),
  ];

  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects
      .filter(p => managerFilter ? p.manager?.id === managerFilter : true)
      .map(p => ({ value: p.id, label: p.name }))
  ];

  const handleManagerFilterChange = (value) => {
    setManagerFilter(value);
    setPage(1);
    
    if (value && projectFilter !== 'all') {
      const selectedProject = projects.find(p => p.id === projectFilter);
      if (selectedProject && selectedProject.manager?.id !== value) {
        setProjectFilter('all');
      }
    }
  };

  const handleProjectFilterChange = (value) => {
    const projId = value || 'all';
    setProjectFilter(projId);
    setPage(1);

    if (projId !== 'all' && managerFilter) {
      const selectedProject = projects.find(p => p.id === projId);
      if (selectedProject && selectedProject.manager?.id !== managerFilter) {
        setManagerFilter('');
      }
    }
  };

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'TASK', label: 'Task' },
    { value: 'BUG', label: 'Bug' },
    { value: 'STORY', label: 'Story' },
    { value: 'EPIC', label: 'Epic' },
    { value: 'SUBTASK', label: 'Subtask' },
  ];

  const filteredTasks = tasks.filter(task => {
    // Search and priority filtering now done on backend
    const manager = projectManagerMap.get(task.project?.id);
    const matchesManager = !managerFilter || manager?.id === managerFilter;

    // Frontend filtering for Members is no longer needed as it's handled on the backend
    return matchesManager;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4">

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to a project.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm
              projects={projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER')}
              users={users}
              onSuccess={handleTaskCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailsModal 
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        task={selectedTask}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details, assignments, or story points.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm
              projects={projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER')}
              users={users}
              task={selectedTask}
              onSuccess={handleTaskUpdated}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedTask(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Filter Toolbar ─── */}
      <div className="flex-none px-0 sm:px-0">
        <div className="bg-secondary/40 p-2 rounded-2xl mb-2 mt-4 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-row items-center gap-2 w-full xl:w-auto">
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 md:hidden rounded-xl border ${showFiltersMobile ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  style={!showFiltersMobile ? { borderColor: 'var(--input-border)' } : undefined}
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                {/* Mobile Action Button */}
                {canCreateTaskGlobal && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-10 h-10 p-0 md:hidden rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto flex-1 justify-end">
                <div className={`flex-col md:flex-row flex-wrap items-center gap-2 w-full md:w-auto ${showFiltersMobile ? 'flex' : 'hidden md:flex'}`}>
                  <SearchableSelect
                    options={projectOptions}
                    value={projectFilter}
                    onChange={handleProjectFilterChange}
                    placeholder="Project"
                    className="w-full md:w-[140px] h-10 rounded-xl bg-background/50 border hover:bg-background transition-all"
                    style={{ borderColor: 'var(--input-border)' }}
                  />
                  <SearchableSelect
                    options={managerOptions}
                    value={managerFilter}
                    onChange={handleManagerFilterChange}
                    placeholder="Manager"
                    className="w-full md:w-[140px] h-10 rounded-xl bg-background/50 border hover:bg-background transition-all"
                    style={{ borderColor: 'var(--input-border)' }}
                  />
                  <SearchableSelect
                    options={priorityOptions}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    placeholder="Priority"
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border hover:bg-background transition-all"
                    style={{ borderColor: 'var(--input-border)' }}
                  />
                  <SearchableSelect
                    options={typeOptions}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    placeholder="Type"
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border hover:bg-background transition-all"
                    style={{ borderColor: 'var(--input-border)' }}
                  />
                  <SearchableSelect
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { label: 'All Status', value: 'all' },
                      { label: 'To Do', value: 'TODO' },
                      { label: 'In Progress', value: 'IN_PROGRESS' },
                      { label: 'In Review', value: 'IN_REVIEW' },
                      { label: 'Completed', value: 'COMPLETED' }
                    ]}
                    placeholder="Status"
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border hover:bg-background transition-all"
                    style={{ borderColor: 'var(--input-border)' }}
                  />
                  
                  {/* Advanced Filters */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl border hover:bg-accent/20 font-semibold text-foreground/80 whitespace-nowrap" style={{ borderColor: 'var(--input-border)' }}>
                        <Filter className="w-4 h-4 mr-2" />
                        Advanced Filters
                        {(selectedProjectIds.length > 0 || selectedAssigneeIds.length > 0 || selectedStatuses.length > 0 || selectedTypes.length > 0 || selectedPriorities.length > 0 || dueDateFrom || dueDateTo || pointsMin || pointsMax) && (
                          <Badge className="ml-2 bg-primary text-primary-foreground h-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                            On
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader className="mb-6">
                        <SheetTitle>Advanced Filters</SheetTitle>
                        <SheetDescription>Apply multiple filters to narrow down the tasks list.</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6">
                         {/* Projects */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Specific Projects</Label>
                            <MultiSearchableSelect 
                               options={projects.map(p => ({ label: p.name, value: p.id }))} 
                               value={selectedProjectIds} 
                               onChange={setSelectedProjectIds} 
                               placeholder="Select projects..." 
                            />
                         </div>
                         
                         {/* Assignees */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Specific Assignees</Label>
                            <MultiSearchableSelect 
                               options={managerOptions} 
                               value={selectedAssigneeIds} 
                               onChange={setSelectedAssigneeIds} 
                               placeholder="Select assignees..." 
                            />
                         </div>

                         {/* Statuses */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Task Statuses</Label>
                            <MultiSearchableSelect 
                               options={[
                                 { label: 'To Do', value: 'TODO' },
                                 { label: 'In Progress', value: 'IN_PROGRESS' },
                                 { label: 'In Review', value: 'IN_REVIEW' },
                                 { label: 'Completed', value: 'COMPLETED' }
                               ]} 
                               value={selectedStatuses} 
                               onChange={setSelectedStatuses} 
                               placeholder="Select statuses..." 
                            />
                         </div>

                         {/* Priorities */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Priorities</Label>
                            <MultiSearchableSelect 
                               options={priorityOptions} 
                               value={selectedPriorities} 
                               onChange={setSelectedPriorities} 
                               placeholder="Select priorities..." 
                            />
                         </div>

                         {/* Types */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Task Types</Label>
                            <MultiSearchableSelect 
                               options={typeOptions} 
                               value={selectedTypes} 
                               onChange={setSelectedTypes} 
                               placeholder="Select types..." 
                            />
                         </div>
                         
                         {/* Due Date Range */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Due Date Between</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <DatePicker date={dueDateFrom} setDate={setDueDateFrom} placeholder="From Date" />
                                <DatePicker date={dueDateTo} setDate={setDueDateTo} placeholder="To Date" />
                            </div>
                         </div>
                         
                         {/* Story Points Range */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Story Points Between</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="number" value={pointsMin} onChange={(e) => setPointsMin(e.target.value)} placeholder="Min Points" />
                                <Input type="number" value={pointsMax} onChange={(e) => setPointsMax(e.target.value)} placeholder="Max Points" />
                            </div>
                         </div>

                         {/* Progress Filter */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Task Progress</Label>
                            <Select value={progressFilter} onValueChange={setProgressFilter}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select progress..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Progress</SelectItem>
                                <SelectItem value="0">0% (To Do)</SelectItem>
                                <SelectItem value="50">50% (In Progress)</SelectItem>
                                <SelectItem value="75">75% (In Review)</SelectItem>
                                <SelectItem value="100">100% (Completed)</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                         {/* Clear button */}
                         <Button variant="outline" className="w-full mt-4 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                             setSelectedProjectIds([]);
                             setSelectedAssigneeIds([]);
                             setSelectedStatuses([]);
                             setSelectedTypes([]);
                             setSelectedPriorities([]);
                             setDueDateFrom(null);
                             setDueDateTo(null);
                             setPointsMin('');
                             setPointsMax('');
                             setProgressFilter('');
                         }}>
                           Clear Advanced Filters
                         </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  {canImport && (
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                      style={{ borderColor: 'var(--input-border)' }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden xl:inline">Import Excel</span>
                    </Button>
                  )}
                  {canCreateTaskGlobal && (
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="min-w-[130px] px-5 h-10 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] font-bold Montserrat text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>New Task</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ─── Main Content Card ─── */}
      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0 sm:pt-4 px-1 sm:px-4">
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="w-[30%] text-center cursor-pointer select-none" onClick={() => handleSort('title')}>TASK {renderSortIcon('title')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('project')}>Project {renderSortIcon('project')}</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort('type')}>Task Type {renderSortIcon('type')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('priority')}>Priority {renderSortIcon('priority')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('points')}>Points {renderSortIcon('points')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('dueDate')}>Due Date {renderSortIcon('dueDate')}</TableHead>
                    <TableHead className="w-[15%]">Progress</TableHead>
                    <TableHead className="text-right pr-6">{user?.role !== 'CLIENT' ? 'Actions' : ''}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No tasks found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task, index) => (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer hover:bg-accent transition-colors group border-b border-border hover:z-50 relative"
                          onClick={() => handleTaskClick(task)}
                        >
                          <TableCell className="relative">
                            <div className="flex items-center justify-start text-left pl-10 pr-6 w-full min-h-[2rem]">
                              <div
                                className="absolute left-4 w-1.5 h-1.5 rounded-full shadow-[0_0_8px] shrink-0"
                                style={{
                                  backgroundColor: task.status === 'TODO' ? '#F59E0B' :
                                    task.status === 'IN_PROGRESS' ? '#00A3FF' :
                                      task.status === 'IN_REVIEW' ? '#D946EF' :
                                        task.status === 'COMPLETED' ? '#48A111' : '#EF4444'
                                }}
                              />
                              <p className="text-sm font-bold Montserrat leading-tight text-foreground group-hover:text-primary transition-colors">{task.title}</p>
  
                              {/* Styled Custom Tooltip */}
                              {task.description && (
                                <div className={cn(
                                  "absolute left-6 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 pointer-events-none transition-all duration-300 z-[100] invisible group-hover:visible",
                                  index === 0 ? "top-full mt-2" : "bottom-full mb-2"
                                )}>
                                  <div 
                                    className="text-xs rounded-xl shadow-2xl p-3 w-64 break-words whitespace-normal text-left font-bold leading-relaxed tracking-wide border border-white/10"
                                    style={{ 
                                      backgroundColor: getProjectColor(task.project?.id, projects),
                                      color: getContrastColor(getProjectColor(task.project?.id, projects))
                                    }}
                                  >
                                    {task.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}
                                  </div>
                                  <div 
                                    className={cn(
                                      "absolute w-3 h-3 border-white/10 rotate-45",
                                      index === 0 ? "-top-1.5 left-6 border-t border-l" : "-bottom-1.5 left-6 border-b border-r"
                                    )}
                                    style={{ backgroundColor: getProjectColor(task.project?.id, projects) }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        <TableCell className="text-xs font-bold Montserrat text-foreground/90">{task.project.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.assignees && task.assignees.length > 0 ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                {task.assignees.slice(0, 3).map(({ user }) => (
                                  <div key={user.id} className="flex items-center gap-2 bg-secondary/20 pr-3 rounded-full border border-border/50">
                                    <Avatar className="h-7 w-7 border border-[#0A0A0A] ring-1 ring-white/10">
                                      <AvatarImage src={user.avatar} />
                                      <AvatarFallback className="text-[10px] bg-white/5 text-muted-foreground">{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{user.name}</span>
                                  </div>
                                ))}
                                {task.assignees.length > 3 && (
                                  <div className="h-7 px-2 rounded-full bg-white/5 border border-[#0A0A0A] flex items-center justify-center text-[10px] text-muted-foreground Montserrat font-bold">
                                    +{task.assignees.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/70 text-[10px] font-bold uppercase tracking-widest Montserrat">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${statusColors[task.status] || ''}`}>
                            {task.status.replace('_', ' ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase flex items-center gap-1 w-fit`}>
                            {task.type === 'BUG' && <Bug className="w-2.5 h-2.5" />}
                            {task.type === 'STORY' && <BookOpen className="w-2.5 h-2.5" />}
                            {task.type === 'EPIC' && <Zap className="w-2.5 h-2.5" />}
                            {task.type === 'SUBTASK' && <GitBranch className="w-2.5 h-2.5" />}
                            {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2.5 h-2.5" />}
                            {task.type || 'TASK'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priorityColors[task.priority]} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase`}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-black Montserrat text-foreground">
                          {task.storyPoints || 0}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold Montserrat text-foreground/90 whitespace-nowrap">
                          {task.completedAt ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-green-500">
                                <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                <span>{formatDate(task.completedAt)}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5 text-muted-foreground/60 text-[9px]">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span>{formatDate(task.dueDate)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-foreground/90">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              <span>{task.dueDate ? formatDate(task.dueDate) : "No Date"}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${getTaskProgress(task)}%`,
                                  backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                                  boxShadow: `0 0 8px ${task.status === 'COMPLETED' ? '#48A11160' : '#00A3FF60'}`
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-black Montserrat text-muted-foreground block text-right">
                              {getTaskProgress(task)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {(() => {
                              const canEditBtn = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.['tasks.editAny'] || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
                              const canDeleteBtn = user?.role === 'ADMIN' || user?.permissions?.['tasks.delete'];
                              if (user?.role === 'CLIENT') return null;
                              
                              if (!canEditBtn && !canDeleteBtn) {
                                return (
                                  <div className="flex items-center justify-center h-8 w-8 text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 rounded-md" title="Restricted - No permission">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {canEditBtn && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTask(task);
                                        setShowEditDialog(true);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDeleteBtn && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(task);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No tasks found</div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex flex-col gap-3 relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{
                              backgroundColor: task.status === 'TODO' ? '#F59E0B' :
                                task.status === 'IN_PROGRESS' ? '#00A3FF' :
                                  task.status === 'IN_REVIEW' ? '#D946EF' :
                                    task.status === 'COMPLETED' ? '#48A111' : '#EF4444'
                            }}
                          />
                          <p className="font-bold text-sm text-foreground leading-tight pr-2">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(() => {
                            const canEditBtn = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.['tasks.editAny'] || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
                            const canDeleteBtn = user?.role === 'ADMIN' || user?.permissions?.['tasks.delete'];
                            if (user?.role === 'CLIENT') return null;
                            
                            if (!canEditBtn && !canDeleteBtn) {
                              return (
                                <div className="flex items-center justify-center h-8 w-8 text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 rounded-md" title="Restricted - No permission">
                                  <Lock className="w-4 h-4" />
                                </div>
                              );
                            }

                            return (
                              <>
                                {canEditBtn && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTask(task);
                                      setShowEditDialog(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDeleteBtn && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(task);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${priorityColors[task.priority]} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shrink-0`}>
                          {task.priority}
                        </Badge>
                        <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shrink-0 flex items-center gap-1`}>
                          {task.type === 'BUG' && <Bug className="w-2 h-2" />}
                          {task.type === 'STORY' && <BookOpen className="w-2 h-2" />}
                          {task.type === 'EPIC' && <Zap className="w-2 h-2" />}
                          {task.type === 'SUBTASK' && <GitBranch className="w-2 h-2" />}
                          {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2 h-2" />}
                          {task.type || 'TASK'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>📁</span>
                          <span className="truncate max-w-[130px] font-medium">{task.project.name}</span>
                        </div>
                        {task.completedAt ? (
                          <div className="flex items-center gap-1.5 text-green-500">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="font-bold">Completed: {formatDate(task.completedAt)}</span>
                          </div>
                        ) : task.dueDate ? (
                          <div className="flex items-center gap-1.5">
                            <span>📅</span>
                            <span className="font-medium">{formatDate(task.dueDate)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm border border-black/5 ${statusColors[task.status] || ''}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{getTaskProgress(task)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{
                            width: `${getTaskProgress(task)}%`,
                            backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete task "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
      <ImportTasksDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchTasks}
        users={users}
      />
    </div>
  );
};

export default Tasks;