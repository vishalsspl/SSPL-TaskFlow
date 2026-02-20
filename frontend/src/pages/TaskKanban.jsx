import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '@/lib/api';
import { Loader2, Search } from 'lucide-react';
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

const TaskKanban = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [managerFilter, setManagerFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const isReadOnly = user?.role === 'CLIENT' || user?.role === 'MEMBER';
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [projectsRes, tasksRes] = await Promise.all([
                api.get('/projects'),
                api.get('/tasks')
            ]);
            setProjects(projectsRes.data);
            setTasks(tasksRes.data);

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

    const handleTaskUpdate = async (taskId, newStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic Update
        const oldStatus = task.status;
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
        ));

        try {
            await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
            // Revert
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: oldStatus } : t
            ));
        }
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
    });

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
            </div>

            <div className="flex-1 overflow-hidden">
                <KanbanBoard
                    tasks={filteredTasks}
                    onTaskUpdate={handleTaskUpdate}
                    isReadOnly={isReadOnly}
                />
            </div>
        </div>
    );
};

export default TaskKanban;
