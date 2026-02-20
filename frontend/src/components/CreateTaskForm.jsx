import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckSquare,
    Layers,
    User,
    Activity,
    AlertCircle,
    Calendar,
    Tag,
    Briefcase
} from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import api from '@/lib/api';

const CreateTaskForm = ({ projects = [], users = [], onSuccess, onCancel, initialProjectId = '' }) => {
    const [formData, setFormData] = useState({
        projectId: initialProjectId,
        phaseId: '',
        title: '',
        description: '',
        assignedTo: '',
        status: 'TODO',
        priority: 'MEDIUM',
        completionPercentage: 0,
        dueDate: '',
        tags: '',
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
        setLoading(true);
        try {
            const payload = {
                ...formData,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
                completionPercentage: Number(formData.completionPercentage),
            };

            await api.post('/tasks', payload);

            setFormData({
                projectId: initialProjectId, // Reset to initial if provided
                phaseId: '',
                title: '',
                description: '',
                assignedTo: '',
                status: 'TODO',
                priority: 'MEDIUM',
                completionPercentage: 0,
                dueDate: '',
                tags: '',
            });

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Failed to create task: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <div className="relative">
                    <CheckSquare className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Design Homepage"
                        required
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="project">Project *</Label>
                    <Select
                        value={formData.projectId}
                        onValueChange={(value) => handleProjectChange(value)}
                        disabled={!!initialProjectId} // Disable if pre-selected via props
                    >
                        <SelectTrigger className="pl-9 relative">
                            <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phase">Phase</Label>
                    <Select
                        value={formData.phaseId}
                        onValueChange={(value) => setFormData({ ...formData, phaseId: value })}
                        disabled={!formData.projectId}
                    >
                        <SelectTrigger className="pl-9 relative">
                            <Layers className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select Phase (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {phases.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="assignee">Assign To</Label>
                    <Select
                        value={formData.assignedTo}
                        onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                    >
                        <SelectTrigger className="pl-9 relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                        <SelectTrigger className="pl-9 relative">
                            <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="To Do" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="IN_REVIEW">In Review</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                        <SelectTrigger className="pl-9 relative">
                            <AlertCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="relative">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Comma separated tags (e.g. design, urgent)"
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <div className="relative">
                    <RichTextEditor
                        value={formData.description}
                        onChange={(value) => setFormData({ ...formData, description: value })}
                        placeholder="Task description..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Task'}
                </Button>
            </div>
        </form>
    );
};

export default CreateTaskForm;
