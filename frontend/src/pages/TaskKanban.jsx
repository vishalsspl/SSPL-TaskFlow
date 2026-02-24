import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '@/lib/api';
import { Loader2, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
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
import CreateTaskForm from '@/components/CreateTaskForm';

const TaskKanban = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [managerFilter, setManagerFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const isReadOnly = user?.role === 'CLIENT' || user?.role === 'MEMBER';
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [projectsRes, tasksRes, usersRes] = await Promise.all([
                api.get('/projects'),
                api.get('/tasks'),
                api.get('/users')
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
        if (user?.role === 'CLIENT') return;
        setSelectedTask(task);
        setShowEditDialog(true);
    };

    const handleTaskUpdated = () => {
        setShowEditDialog(false);
        setSelectedTask(null);
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Build a lookup: projectId → manager info
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
                    .map(p => [p.manager.id, { value: p.manager.id, label: p.manager.name }])
            ).values()
        ),
    ];

    const priorityOptions = [
        { value: '', label: 'All Priorities' },
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'CRITICAL', label: 'Critical' },
    ];

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesProject = selectedProjectId === 'all' ||
            task.projectId === selectedProjectId ||
            task.project?.id === selectedProjectId;

        const matchesPriority = !priorityFilter || task.priority === priorityFilter;

        const projectId = task.projectId || task.project?.id;
        const manager = projectManagerMap.get(projectId);
        const matchesManager = !managerFilter || manager?.id === managerFilter;

        return matchesSearch && matchesProject && matchesPriority && matchesManager;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="p-8 h-screen flex flex-col">
            <div className="flex flex-col gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {selectedProjectId === 'all'
                            ? 'Kanban Board'
                            : projects.find(p => p.id === selectedProjectId)?.name || 'Kanban Board'
                        }
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {isReadOnly
                            ? 'View task status and project progress'
                            : 'Drag and drop tasks to update their status'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search tasks..."
                                className="pl-8 w-full sm:w-[200px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <SearchableSelect
                            options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                            value={selectedProjectId}
                            onChange={(val) => setSelectedProjectId(val || 'all')}
                            placeholder="All Projects"
                            searchPlaceholder="Search project..."
                            className="w-full sm:w-[200px]"
                        />
                        <SearchableSelect
                            options={managerOptions}
                            value={managerFilter}
                            onChange={setManagerFilter}
                            placeholder="All Managers"
                            searchPlaceholder="Search manager..."
                            className="w-full sm:w-[200px]"
                        />
                        <SearchableSelect
                            options={priorityOptions}
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                            placeholder="All Priorities"
                            searchPlaceholder="Search priority..."
                            className="w-full sm:w-[160px]"
                        />
                    </div>

                    {!isReadOnly && (
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Task
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
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
                    onEdit={handleTaskClick}
                />
            </div>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>
                            Update task details, assignments, or story points.
                        </DialogDescription>
                    </DialogHeader>
                    <CreateTaskForm
                        projects={projects}
                        users={users}
                        task={selectedTask}
                        onSuccess={handleTaskUpdated}
                        onCancel={() => {
                            setShowEditDialog(false);
                            setSelectedTask(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task to your workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <CreateTaskForm
                        projects={projects}
                        users={users}
                        initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : ''}
                        onSuccess={() => {
                            setShowCreateDialog(false);
                            fetchData();
                        }}
                        onCancel={() => setShowCreateDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default TaskKanban;
