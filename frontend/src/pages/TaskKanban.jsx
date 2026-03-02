import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '@/lib/api';
import { Loader2, Search, Plus, Layers } from 'lucide-react';
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

        // Filter for Members: only show assigned tasks
        const isMember = user?.role === 'MEMBER';
        const isAssignedToMe = task.assignees?.some(a => a.userId === user?.id);
        if (isMember && !isAssignedToMe) return false;

        return matchesSearch && matchesProject && matchesPriority && matchesManager;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="p-6 min-h-full flex flex-col bg-[#050505]">
            <div className="flex items-end justify-between mb-4 gap-4 px-2">
                <div className="flex-1">
                    <h1 className="text-xl font-black Montserrat text-white tracking-tight leading-none">
                        {selectedProjectId === 'all' ? (
                            <>Global <span className="text-primary text-sm tracking-[0.2em] ml-2">KANBAN</span></>
                        ) : (
                            projects.find(p => p.id === selectedProjectId)?.name || 'Project Kanban'
                        )}
                    </h1>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600" />
                        <Input
                            type="search"
                            placeholder="Find..."
                            className="pl-8 w-[140px] bg-white/5 border-white/5 text-white Montserrat font-bold rounded-lg h-8 focus:ring-primary/20 transition-all text-[10px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <SearchableSelect
                        options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                        value={selectedProjectId}
                        onChange={(val) => setSelectedProjectId(val || 'all')}
                        placeholder="Project"
                        className="w-[120px] h-8 text-[9px]"
                    />
                    <SearchableSelect
                        options={managerOptions}
                        value={managerFilter}
                        onChange={setManagerFilter}
                        placeholder="Lead"
                        className="w-[110px] h-8 text-[9px]"
                    />
                    <SearchableSelect
                        options={priorityOptions}
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                        placeholder="Priority"
                        className="w-[110px] h-8 text-[9px]"
                    />
                    {!isReadOnly && (
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-primary hover:bg-primary/90 text-white Montserrat font-black uppercase tracking-widest rounded-lg h-8 px-3 text-[9px]"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Task
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 rounded-2xl bg-[#080808]/80 border border-white/5 p-3 glass mb-2 shadow-2xl relative overflow-hidden group/board">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
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
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-white/10 text-white rounded-3xl p-0 no-scrollbar">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black Montserrat">Edit Task</DialogTitle>
                            <DialogDescription className="text-gray-500 font-bold Montserrat">
                                Synchronize mission-critical task parameters.
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
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-white/10 text-white rounded-3xl p-0 no-scrollbar">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black Montserrat">Initiate Task</DialogTitle>
                            <DialogDescription className="text-gray-500 font-bold Montserrat">
                                Deploy a new task to the operational theater.
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
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskKanban;
