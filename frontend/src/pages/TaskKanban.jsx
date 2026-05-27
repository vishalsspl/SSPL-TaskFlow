import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '@/lib/api';
import { Loader2, Search, Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import CreateTaskForm from '@/components/forms/CreateTaskForm';
import DeleteConfirmDialog from '@/components/ui/delete-confirm-dialog';

const TaskKanban = () => {
    const { user } = useAuthStore();
    const { setHeader, searchTerm: globalSearch, setSearchTerm: setGlobalSearch } = useHeaderStore();
    const { toast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [managerFilter, setManagerFilter] = useState('all');

    const isReadOnly = user?.role === 'CLIENT';
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedProjectId) {
            setHeader("Task Kanban", "Select a project to view its Kanban board", true, "Search projects...");
        } else {
            setHeader("Task Kanban", "Orchestrate tasks with drag-and-drop", true, "Find tasks...");
        }
    }, [selectedProjectId, setHeader]);

    const fetchData = async () => {
        try {
            const usersParams = user?.role === 'MANAGER' ? { teamOnly: 'true' } : {};
            const [projectsRes, tasksRes, usersRes] = await Promise.all([
                api.get('/projects'),
                api.get('/tasks'),
                api.get('/users', { params: usersParams })
            ]);
            setProjects(projectsRes.data);
            setTasks(tasksRes.data);
            setUsers(usersRes.data.filter(u => u.role !== 'CLIENT'));

            // Auto-select project if only one exists
            if (projectsRes.data.length === 1) {
                setSelectedProjectId(projectsRes.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task) => {
        if (user?.role === 'CLIENT' || user?.role === 'MEMBER') return;
        setSelectedTask(task);
        setShowEditDialog(true);
    };

    const handleTaskUpdated = () => {
        setShowEditDialog(false);
        setSelectedTask(null);
        fetchData();
    };

    const handleDeleteTask = async (taskId) => {
        setTaskToDelete(taskId);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await api.delete(`/tasks/${taskToDelete}`);
            toast({ title: 'Task Deleted', description: 'The task has been removed.' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete task:', error);
            toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
        } finally {
            setShowDeleteDialog(false);
            setTaskToDelete(null);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
            toast({ title: 'Status Updated', description: `Task moved to ${newStatus.replace('_', ' ')}.` });
            fetchData();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast({ title: 'Error', description: error.response?.data?.error || 'Failed to update task status.', variant: 'destructive' });
        }
    };

    const handleApproveStatus = async (taskId) => {
        try {
            await api.post(`/tasks/${taskId}/approve-status`);
            toast({ title: 'Status Approved', description: 'The task status change has been approved.' });
            fetchData();
        } catch (error) {
            console.error('Failed to approve status:', error);
            toast({ title: 'Error', description: error.response?.data?.error || 'Failed to approve status.', variant: 'destructive' });
        }
    };

    const handleRejectStatus = async (taskId) => {
        try {
            await api.post(`/tasks/${taskId}/reject-status`);
            toast({ title: 'Status Rejected', description: 'The task has been reverted to its previous status.' });
            fetchData();
        } catch (error) {
            console.error('Failed to reject status:', error);
            toast({ title: 'Error', description: error.response?.data?.error || 'Failed to reject status.', variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const priorityOptions = [
        { value: '', label: 'All Priorities' },
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
    ];

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(globalSearch.toLowerCase());
        const matchesManager = managerFilter === 'all' || project.managerId === managerFilter;
        return matchesSearch && matchesManager;
    });

    const filteredTasks = tasks.filter(task => {
        if (!selectedProjectId) return false;

        const matchesSearch = task.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(globalSearch.toLowerCase()));

        const matchesProject = task.projectId === selectedProjectId ||
            task.project?.id === selectedProjectId;

        const matchesPriority = !priorityFilter || task.priority === priorityFilter;

        // Filter for Members: only show assigned tasks
        const isMember = user?.role === 'MEMBER';
        const isAssignedToMe = task.assignees?.some(a => a.userId === user?.id);
        if (isMember && !isAssignedToMe) return false;

        return matchesSearch && matchesProject && matchesPriority;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // If no project selected, show project picker
    if (!selectedProjectId) {
        return (
            <div className="p-4 h-full flex flex-col bg-background overflow-y-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black Montserrat text-foreground tracking-tight">
                            Task <span className="text-primary">Kanban</span>
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground Montserrat">
                            Select a project to view its Kanban board
                        </p>
                    </div>

                    <div className="bg-secondary/30 border border-border/60 p-2 rounded-2xl flex flex-wrap items-center gap-2 sm:gap-3">
                        <SearchableSelect
                            options={[
                                { value: 'all', label: 'All Managers' },
                                ...users
                                    .filter(u => u.role === 'MANAGER')
                                    .map(u => ({ value: u.id, label: u.name }))
                            ]}
                            value={managerFilter}
                            onChange={(val) => setManagerFilter(val || 'all')}
                            placeholder="Filter by Manager"
                            searchPlaceholder="Search manager..."
                            className="flex-1 min-w-[140px] sm:w-[200px] sm:flex-none h-11 rounded-xl"
                        />
                    </div>
                </div>

                {filteredProjects.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-card/50 border border-dashed border-border rounded-3xl">
                        <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-bold Montserrat text-foreground">No projects found</h3>
                        <p className="text-muted-foreground Montserrat mt-1">Try adjusting your filters or search terms.</p>
                        {(globalSearch || managerFilter !== 'all') && (
                            <Button
                                variant="link"
                                onClick={() => {
                                    setGlobalSearch('');
                                    setManagerFilter('all');
                                }}
                                className="mt-2 text-primary"
                            >
                                Clear all filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProjects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => setSelectedProjectId(project.id)}
                                className="bg-card border border-border rounded-2xl p-6 cursor-pointer hover:ring-2 hover:ring-primary/40 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {project.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground Montserrat truncate group-hover:text-primary transition-colors">{project.name}</h3>
                                        <p className="text-xs text-muted-foreground capitalize">{project.status?.toLowerCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>{project._count?.tasks || 0} tasks</span>
                                    <span>•</span>
                                    <span>{project.manager?.name || 'No manager'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 h-full flex flex-col bg-background no-scrollbar overflow-hidden">
            <div className="flex flex-col gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex flex-col gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            {projects.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedProjectId('')}
                                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                                </Button>
                            )}
                            <h1 className="text-lg sm:text-2xl font-black Montserrat text-foreground tracking-tight truncate">
                                {projects.find(p => p.id === selectedProjectId)?.name || 'Project Kanban'}
                            </h1>
                        </div>
                        <p className="mt-1 sm:mt-2 text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] Montserrat flex items-center gap-1.5 sm:gap-2">
                            <Layers className="w-2.5 h-2.5 sm:w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">
                                {isReadOnly
                                    ? 'View-only access to progress'
                                    : 'Orchestrate tasks with drag-and-drop'}
                            </span>
                        </p>
                    </div>

                    <div className="bg-secondary/30 border border-border/60 p-1 sm:p-1.5 rounded-lg sm:rounded-xl flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <SearchableSelect
                                options={projects.map(p => ({ value: p.id, label: p.name }))}
                                value={selectedProjectId}
                                onChange={(val) => setSelectedProjectId(val || '')}
                                placeholder="Project"
                                searchPlaceholder="Search projects..."
                                className="flex-1 sm:flex-none sm:w-[200px] h-9 sm:h-11 rounded-lg sm:rounded-xl"
                            />

                            <SearchableSelect
                                options={priorityOptions}
                                value={priorityFilter}
                                onChange={setPriorityFilter}
                                placeholder="Priorities"
                                searchPlaceholder="Search priority..."
                                className="flex-1 sm:flex-none sm:w-[150px] h-9 sm:h-11 rounded-lg sm:rounded-xl"
                            />
                        </div>
                        {(() => {
                            let canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';
                            if (user?.role === 'MEMBER') {
                                if (selectedProjectId) {
                                    const selectedProject = projects.find(p => p.id === selectedProjectId);
                                    canCreate = selectedProject?.allowMemberTaskCreation;
                                } else {
                                    canCreate = projects.some(p => p.allowMemberTaskCreation);
                                }
                            }
                            return canCreate ? (
                            <Button
                                onClick={() => setShowCreateDialog(true)}
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground Montserrat font-black uppercase tracking-widest rounded-lg sm:rounded-xl h-9 sm:h-11 px-6 sm:px-8 shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)] transition-all hover:scale-[1.02] active:scale-95 text-xs sm:text-sm"
                            >
                                <Plus className="w-4 h-4 sm:w-5 h-5 mr-1.5 sm:mr-2 stroke-[3]" />
                                New Task
                            </Button>
                            ) : null;
                        })()}
                    </div>
                </div>

            <div className="flex-1 overflow-hidden rounded-xl sm:rounded-3xl bg-card/50 border border-border p-1.5 sm:p-3 md:p-4 glass">
                <KanbanBoard
                    tasks={filteredTasks}
                    onTaskUpdate={async (taskId, newStatus) => {
                        try {
                            await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
                            fetchData();
                        } catch (error) {
                            console.error('Failed to update status:', error);
                        }
                    }}
                    isReadOnly={isReadOnly}
                    onEdit={(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER') ? handleTaskClick : undefined}
                    onDelete={(user?.role === 'ADMIN' || user?.role === 'MANAGER') ? handleDeleteTask : undefined}
                    onStatusChange={isReadOnly ? undefined : handleStatusChange}
                    onApprove={handleApproveStatus}
                    onReject={handleRejectStatus}
                />
            </div>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] bg-card border-border text-foreground rounded-xl sm:rounded-3xl p-0 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto p-4 sm:p-8 flex-1 w-full relative no-scrollbar">
                        <DialogHeader className="mb-2 sm:mb-6">
                            <DialogTitle className="text-xl font-black Montserrat">Edit Task</DialogTitle>
                            <DialogDescription className="text-gray-500 font-bold Montserrat">
                                Synchronize mission-critical task parameters.
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

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] bg-card border-border text-foreground rounded-xl sm:rounded-3xl p-0 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto p-4 sm:p-8 flex-1 w-full relative no-scrollbar">
                        <DialogHeader className="mb-2 sm:mb-6">
                            <DialogTitle className="text-xl font-black Montserrat">Initiate Task</DialogTitle>
                            <DialogDescription className="text-gray-500 font-bold Montserrat">
                                Deploy a new task to the operational theater.
                            </DialogDescription>
                        </DialogHeader>
                        <CreateTaskForm
                            projects={projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER')}
                            users={users}
                            initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : ''}
                            onSuccess={() => {
                                setShowCreateDialog(false);
                                fetchData();
                            }}
                            onCancel={() => setShowCreateDialog(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog 
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={confirmDelete}
                title="Delete Task"
                description="Are you sure you want to delete this task? This action cannot be undone and will remove it from the board."
            />
        </div>
    );
};

export default TaskKanban;