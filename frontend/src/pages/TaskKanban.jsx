import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { priorityColors } from '@/lib/utils';
import ProjectOverview from '@/components/ProjectOverview';
import { useAuthStore } from '@/store/authStore';

const KanbanColumn = ({ status, title, tasks, onDrop, onDragOver, onDragStart, color, isReadOnly }) => {
    return (
        <div
            className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-4 flex flex-col h-full"
            onDragOver={!isReadOnly ? onDragOver : undefined}
            onDrop={!isReadOnly ? (e) => onDrop(e, status) : undefined}
        >
            <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${color}`}>
                <h3 className="font-semibold text-gray-700">{title}</h3>
                <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full font-medium border">
                    {tasks.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        draggable={!isReadOnly}
                        onDragStart={!isReadOnly ? (e) => onDragStart(e, task) : undefined}
                        className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 transition-shadow ${isReadOnly
                                ? 'cursor-default'
                                : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</span>
                            {task.priority && (
                                <Badge className={`text-[10px] px-1 py-0 h-5 ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center -space-x-2">
                                {task.assignee ? (
                                    task.assignee.avatar ? (
                                        <img
                                            src={task.assignee.avatar}
                                            alt={task.assignee.name}
                                            className="w-6 h-6 rounded-full border-2 border-white"
                                            title={task.assignee.name}
                                        />
                                    ) : (
                                        <div
                                            className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border-2 border-white"
                                            title={task.assignee.name}
                                        >
                                            {task.assignee.name.charAt(0)}
                                        </div>
                                    )
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white" title="Unassigned" />
                                )}
                            </div>

                            {task.dueDate && (
                                <span className="text-[10px] text-gray-500">
                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>

                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                            <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${task.completionPercentage}%` }}
                            />
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                        No tasks
                    </div>
                )}
            </div>
        </div>
    );
};

const TaskKanban = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('all');

    const isReadOnly = user?.role === 'CLIENT';

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

    const handleDragStart = (e, task) => {
        if (isReadOnly) return;
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, newStatus) => {
        if (isReadOnly) return;
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');

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

    const priorityWeight = {
        URGENT: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
    };

    const sortTasks = (tasksToSort) => {
        return [...tasksToSort].sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 0;
            const weightB = priorityWeight[b.priority] || 0;
            return weightB - weightA;
        });
    };

    const columns = {
        TODO: sortTasks(filteredTasks.filter(t => t.status === 'TODO')),
        IN_PROGRESS: sortTasks(filteredTasks.filter(t => t.status === 'IN_PROGRESS')),
        IN_REVIEW: sortTasks(filteredTasks.filter(t => t.status === 'IN_REVIEW')),
        COMPLETED: sortTasks(filteredTasks.filter(t => t.status === 'COMPLETED')),
    };

    return (
        <div className="p-8 h-screen flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
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

            {selectedProjectId !== 'all' && (
                <ProjectOverview projectId={selectedProjectId} />
            )}

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                <KanbanColumn
                    status="TODO"
                    title="To Do"
                    tasks={columns.TODO}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    color="border-gray-400"
                    isReadOnly={isReadOnly}
                />
                <KanbanColumn
                    status="IN_PROGRESS"
                    title="In Progress"
                    tasks={columns.IN_PROGRESS}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    color="border-blue-400"
                    isReadOnly={isReadOnly}
                />
                <KanbanColumn
                    status="IN_REVIEW"
                    title="In Review"
                    tasks={columns.IN_REVIEW}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    color="border-purple-400"
                    isReadOnly={isReadOnly}
                />
                <KanbanColumn
                    status="COMPLETED"
                    title="Completed"
                    tasks={columns.COMPLETED}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    color="border-green-400"
                    isReadOnly={isReadOnly}
                />
            </div>
        </div>
    );
};

export default TaskKanban;
