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
    X,
    File as FileIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
// Removed MultiSearchableSelect import as it is no longer used
import RichTextEditor from '@/components/ui/RichTextEditor';
import { DatePicker } from '@/components/ui/date-picker';
import api, { getFileUrl } from '@/lib/api';
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
        assigneeId: task?.assignees?.[0]?.userId || (user?.role === 'MEMBER' ? user.id : ''),
        status: task?.status || 'TODO',
        priority: task?.priority || 'MEDIUM',
        completionPercentage: task?.completionPercentage || 0,
        dueDate: task?.dueDate ? new Date(task.dueDate) : null,
        tags: task?.tags?.join(', ') || '',
        storyPoints: task?.storyPoints || 0,
        type: task?.type || 'TASK',
        sendEmail: localStorage.getItem('preferNoEmail') !== 'true',
        attachments: task?.attachments ? (typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments) : [],
    });

    const [phases, setPhases] = useState([]);
    const [projectMemberIds, setProjectMemberIds] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (formData.projectId) {
            fetchPhases(formData.projectId);
        }
    }, [formData.projectId]);

    const fetchPhases = async (projectId) => {
        if (!projectId) {
            setPhases([]);
            setProjectMemberIds([]);
            return;
        }
        try {
            const response = await api.get(`/projects/${projectId}`);
            setPhases(response.data.phases || []);
            
            const memberIds = new Set();
            if (response.data.managerId) memberIds.add(response.data.managerId);
            if (response.data.clientId) memberIds.add(response.data.clientId);
            if (response.data.workloads) {
                response.data.workloads.forEach(w => memberIds.add(w.user.id));
            }
            if (task?.assignees?.[0]?.userId) {
                memberIds.add(task.assignees[0].userId);
            }
            setProjectMemberIds(Array.from(memberIds));
        } catch (error) {
            console.error('Failed to fetch project details:', error);
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

        if (formData.projectId && !formData.phaseId) {
            toast({ title: "Validation Error", description: "Please select a project phase.", variant: "destructive" });
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
                assigneeIds: formData.assigneeId ? [formData.assigneeId] : [],
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
                    assigneeId: user?.role === 'MEMBER' ? user.id : '',
                    status: 'TODO',
                    priority: 'MEDIUM',
                    completionPercentage: 0,
                    dueDate: '',
                    tags: '',
                    storyPoints: 0,
                    type: 'TASK',
                    attachments: [],
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
                    <Label htmlFor="project" className="text-foreground/90 font-semibold mobile-reduce-label">Project</Label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            value={formData.projectId}
                            onChange={(value) => handleProjectChange(value)}
                            disabled={!!initialProjectId || isEdit}
                            options={[{ label: 'None (General Tasks)', value: '' }, ...projects.filter(p => p.name !== 'General' && p.name !== 'General Tasks' && (user?.role === 'ADMIN' || user?.role === 'MANAGER' || p.allowMemberTaskCreation)).map((p) => ({ label: p.name, value: p.id }))]}
                            placeholder="Select Project"
                            className="!pl-10 relative mobile-reduce-input"
                        />
                    </div>
                </div>

                {/* Phase */}
                {(() => {
                    const selectedProjectObj = projects.find(p => p.id === formData.projectId);
                    const isGeneralProject = !formData.projectId || 
                        selectedProjectObj?.name === 'General' || 
                        selectedProjectObj?.name === 'General Tasks' || 
                        task?.project?.name === 'General' || 
                        task?.project?.name === 'General Tasks';
                    const showPhaseAsterisk = formData.projectId && !isGeneralProject;
                    
                    return (
                        <div className="space-y-2">
                            <Label htmlFor="phase" className="text-foreground/90 font-semibold mobile-reduce-label">
                                Phase {showPhaseAsterisk && <span className="text-red-500">*</span>}
                            </Label>
                            <div className="relative">
                                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                                <SearchableSelect
                                    value={formData.phaseId}
                                    onChange={(value) => setFormData({ ...formData, phaseId: value })}
                                    disabled={isGeneralProject}
                                    options={phases.map((p) => ({ label: p.name, value: p.id }))}
                                    placeholder={isGeneralProject ? "Not applicable" : "Select Phase"}
                                    className="!pl-10 relative mobile-reduce-input"
                                />
                            </div>
                        </div>
                    );
                })()}

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
                    <Label htmlFor="assignee" className="text-foreground/90 font-semibold mobile-reduce-label">Assign To</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            options={Array.from(new Map(
                                users
                                    .filter(u => {
                                        // Members can only assign to themselves (or are disabled anyway)
                                        if (user?.role === 'MEMBER') return u.id === user.id;
                                        // Admins/Managers can only assign to project members (if a project is selected)
                                        if (formData.projectId && projectMemberIds.length > 0) {
                                            return projectMemberIds.includes(u.id) || u.id === user.id;
                                        }
                                        return true; // Fallback if no project selected yet
                                    })
                                    .map(u => [u.id, { 
                                        value: u.id, 
                                        label: u.name,
                                        sublabel: `${u.email} (${u.role})`,
                                        initial: u.name.charAt(0)
                                    }])
                            ).values())}
                            value={formData.assigneeId}
                            onChange={(id) => setFormData({ ...formData, assigneeId: id })}
                            disabled={user?.role === 'MEMBER'}
                            placeholder="Select assignee..."
                            searchPlaceholder="Search team members..."
                            className="!pl-10 mobile-reduce-input"
                            renderOption={(option) => (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                        {option.initial}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold truncate">{option.label}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">{option.sublabel}</span>
                                    </div>
                                </div>
                            )}
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
                                { label: 'Urgent', value: 'URGENT' }
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
                            onAttach={(fileData) => setFormData(prev => ({ ...prev, attachments: [...prev.attachments, fileData] }))}
                        />
                        {formData.attachments && formData.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-secondary/40 border border-border/60 rounded-md px-2 py-1 text-sm group">
                                        <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                        <a href={getFileUrl(file.url)} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px] text-xs font-medium">
                                            {file.name}
                                        </a>
                                        <span className="text-[10px] text-muted-foreground mr-1">
                                            ({(file.size / 1024).toFixed(0)}KB)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newAtts = [...formData.attachments];
                                                newAtts.splice(idx, 1);
                                                setFormData({ ...formData, attachments: newAtts });
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors opacity-60 group-hover:opacity-100"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                        onCheckedChange={(checked) => {
                            setFormData({ ...formData, sendEmail: checked });
                            if (checked) {
                                localStorage.removeItem('preferNoEmail');
                            } else {
                                localStorage.setItem('preferNoEmail', 'true');
                            }
                        }}
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
