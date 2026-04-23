import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    CheckSquare,
    Layers,
    User,
    Activity,
    AlertCircle,
    Calendar,
    Tag,
    Briefcase,
    Zap,
    Bug,
    BookOpen,
    GitBranch,
    Mail,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MultiSearchableSelect } from '@/components/ui/multi-searchable-select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { DatePicker } from '@/components/ui/date-picker';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const CreateTaskForm = ({ projects = [], users = [], onSuccess, onCancel, initialProjectId = '', task = null }) => {
    const { toast } = useToast();
    const { user } = useAuthStore();
    const isEdit = !!task;
    const [formData, setFormData] = useState({
        projectId: task?.projectId || initialProjectId,
        phaseId: task?.phaseId || '',
        title: task?.title || '',
        description: task?.description || '',
        assigneeIds: task?.assignees?.map(a => a.userId) || [],
        status: task?.status || 'TODO',
        priority: task?.priority || 'MEDIUM',
        completionPercentage: task?.completionPercentage || 0,
        dueDate: task?.dueDate ? new Date(task.dueDate) : null,
        tags: task?.tags?.join(', ') || '',
        storyPoints: task?.storyPoints || 0,
        type: task?.type || 'TASK',
        sendEmail: true,
    });

    const [phases, setPhases] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (formData.projectId) {
            fetchPhases(formData.projectId);
        }
    }, [formData.projectId]);

    const fetchPhases = async (projectId) => {
        if (!projectId) {
            setPhases([]);
            return;
        }
        try {
            const response = await api.get(`/projects/${projectId}`);
            setPhases(response.data.phases || []);
        } catch (error) {
            console.error('Failed to fetch phases:', error);
        }
    };

    const handleProjectChange = (projectId) => {
        setFormData({ ...formData, projectId, phaseId: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedTitle = formData.title.trim();
        if (!trimmedTitle) {
            toast({ title: "Validation Error", description: "Task name cannot be empty.", variant: "destructive" });
            return;
        }

        if (/^\d/.test(trimmedTitle)) {
            toast({ title: "Validation Error", description: "Task title cannot start with a number.", variant: "destructive" });
            return;
        }

        if (!/^[a-zA-Z0-9\s]+$/.test(trimmedTitle)) {
            toast({ title: "Validation Error", description: "Task name cannot contain special characters.", variant: "destructive" });
            return;
        }

        if (!formData.phaseId) {
            toast({ title: "Validation Error", description: "Please select a project phase.", variant: "destructive" });
            return;
        }

        if (formData.assigneeIds.length === 0) {
            toast({ title: "Validation Error", description: "Please assign at least one team member.", variant: "destructive" });
            return;
        }

        if (!formData.dueDate) {
            toast({ title: "Validation Error", description: "Please select a due date.", variant: "destructive" });
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(formData.dueDate) < today) {
            toast({ title: "Validation Error", description: "Due date cannot be in the past.", variant: "destructive" });
            return;
        }

        if (Number(formData.storyPoints) < 0) {
            toast({ title: "Validation Error", description: "Story points cannot be negative.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                title: trimmedTitle,
                tags: formData.tags ? (typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()) : formData.tags) : [],
                completionPercentage: Number(formData.completionPercentage),
                assigneeIds: formData.assigneeIds,
                storyPoints: Number(formData.storyPoints),
            };

            if (isEdit) {
                await api.put(`/tasks/${task.id}`, payload);
            } else {
                await api.post('/tasks', payload);
            }

            if (!isEdit) {
                setFormData({
                    projectId: initialProjectId,
                    phaseId: '',
                    title: '',
                    description: '',
                    assigneeIds: [],
                    status: 'TODO',
                    priority: 'MEDIUM',
                    completionPercentage: 0,
                    dueDate: '',
                    tags: '',
                    storyPoints: 0,
                    type: 'TASK',
                });
            }

            if (onSuccess) {
                toast({
                    title: isEdit ? "Task Updated" : "Task Created",
                    description: isEdit ? "Task details have been updated." : "New task has been created successfully.",
                });
                onSuccess();
            }
        } catch (error) {
            console.error(isEdit ? 'Failed to update task:' : 'Failed to create task:', error);
            toast({
                title: isEdit ? "Update Failed" : "Create Failed",
                description: error.response?.data?.error || (isEdit ? "Failed to update task." : "Failed to create task."),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mobile-reduce-spacing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mobile-reduce-grid">

                {/* Task Title - Full Width */}
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title" className="text-foreground/90 font-semibold mobile-reduce-label">Task Title <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Design Homepage"
                            required
                            className="!pl-10 transition-all focus:ring-2 focus:ring-primary/20 mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Project */}
                <div className="space-y-2">
                    <Label htmlFor="project" className="text-foreground/90 font-semibold mobile-reduce-label">Project <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.projectId}
                            onChange={(value) => handleProjectChange(value)}
                            disabled={!!initialProjectId || isEdit}
                            options={projects.map((p) => ({ label: p.name, value: p.id }))}
                            placeholder="Select Project"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Phase */}
                <div className="space-y-2">
                    <Label htmlFor="phase" className="text-foreground/90 font-semibold mobile-reduce-label">Phase <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.phaseId}
                            onChange={(value) => setFormData({ ...formData, phaseId: value })}
                            disabled={!formData.projectId}
                            options={phases.map((p) => ({ label: p.name, value: p.id }))}
                            placeholder="Select Phase"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Task Type */}
                <div className="space-y-2">
                    <Label htmlFor="type" className="text-foreground/90 font-semibold mobile-reduce-label">Task Type <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.type}
                            onChange={(value) => setFormData({ ...formData, type: value })}
                            options={[
                                { label: 'Task', value: 'TASK', icon: <CheckSquare className="w-4 h-4 text-blue-500" /> },
                                { label: 'Bug', value: 'BUG', icon: <Bug className="w-4 h-4 text-red-500" /> },
                                { label: 'Story', value: 'STORY', icon: <BookOpen className="w-4 h-4 text-emerald-500" /> },
                                { label: 'Epic', value: 'EPIC', icon: <Zap className="w-4 h-4 text-purple-500" /> },
                                { label: 'Subtask', value: 'SUBTASK', icon: <GitBranch className="w-4 h-4 text-cyan-500" /> }
                            ]}
                            placeholder="Select Type"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Assign To */}
                <div className="space-y-2">
                    <Label htmlFor="assignee" className="text-foreground/90 font-semibold mobile-reduce-label">Assign To <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <MultiSearchableSelect
                            options={Array.from(new Map(users.map(u => [u.id, { value: u.id, label: `${u.name} (${u.role})` }])).values())}
                            value={formData.assigneeIds}
                            onChange={(ids) => setFormData({ ...formData, assigneeIds: ids })}
                            placeholder="Select assignees..."
                            searchPlaceholder="Search team members..."
                            className="!pl-10 mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <Label htmlFor="status" className="text-foreground/90 font-semibold mobile-reduce-label">Status <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.status}
                            onChange={(value) => setFormData({ ...formData, status: value })}
                            options={[
                                { label: 'To Do', value: 'TODO' },
                                { label: 'In Progress', value: 'IN_PROGRESS' },
                                { label: 'In Review', value: 'IN_REVIEW' },
                                { label: 'Completed', value: 'COMPLETED' }
                            ]}
                            placeholder="To Do"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                    <Label htmlFor="priority" className="text-foreground/90 font-semibold mobile-reduce-label">Priority <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.priority}
                            onChange={(value) => setFormData({ ...formData, priority: value })}
                            options={[
                                { label: 'Low', value: 'LOW' },
                                { label: 'Medium', value: 'MEDIUM' },
                                { label: 'High', value: 'HIGH' },
                                { label: 'Critical', value: 'CRITICAL' }
                            ]}
                            placeholder="Medium"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-foreground/90 font-semibold mobile-reduce-label">Due Date <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <DatePicker
                            date={formData.dueDate}
                            setDate={(date) => setFormData({ ...formData, dueDate: date })}
                            placeholder="Select due date"
                            className="mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Story Points */}
                <div className="space-y-2">
                    <Label htmlFor="storyPoints" className="text-foreground/90 font-semibold mobile-reduce-label">Story Points</Label>
                    <div className="relative">
                        <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.storyPoints.toString()}
                            onChange={(value) => setFormData({ ...formData, storyPoints: parseInt(value) })}
                            options={[0, 1, 2, 3, 5, 8, 13, 21].map((point) => ({
                                label: `${point} Points`,
                                value: point.toString()
                            }))}
                            placeholder="0"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Tags */}
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="tags" className="text-foreground/90 font-semibold mobile-reduce-label">Tags</Label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                        <Input
                            id="tags"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="e.g. frontend, urgent, design"
                            className="!pl-10 transition-all focus:ring-2 focus:ring-primary/20 mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Description - Full Width */}
                <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description" className="text-foreground/90 font-semibold mobile-reduce-label">Description (Optional)</Label>
                    <div className="relative">
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Task description..."
                        />
                    </div>
                </div>
            </div>

            {/* Email Notification Toggle */}
            {user?.activeFeatures?.emailsupport !== false && (
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <Label htmlFor="sendEmail" className="text-sm font-semibold cursor-pointer">Email Notifications</Label>
                            <p className="text-xs text-muted-foreground">Notify assignees about this task</p>
                        </div>
                    </div>
                    <Switch
                        id="sendEmail"
                        checked={formData.sendEmail}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
                    />
                </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t mt-1 sm:mt-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto h-10 font-bold rounded-xl">
                    Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 font-bold rounded-xl px-8">
                    {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Task' : 'Create Task')}
                </Button>
            </div>
        </form>
    );
};

export default CreateTaskForm;
