import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import KanbanBoard from '@/components/kanban/KanbanBoard';

const TaskKanban = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('all');

    const isReadOnly = user?.role === 'CLIENT';
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

    const filteredTasks = selectedProjectId === 'all'
        ? tasks
        : tasks.filter(t => t.projectId === selectedProjectId);

    return (
        <div className="p-8 h-screen flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {selectedProjectId === 'all'
                            ? 'Task Board'
                            : projects.find(p => p.id === selectedProjectId)?.name || 'Task Board'
                        }
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {isReadOnly
                            ? 'View task status and project progress'
                            : 'Drag and drop tasks to update their status'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <label htmlFor="project-filter" className="text-sm font-medium text-gray-700">
                        Filter Project:
                    </label>
                    <select
                        id="project-filter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                        <option value="all">All Projects</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
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
