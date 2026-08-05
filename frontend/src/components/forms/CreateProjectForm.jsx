import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileText,
    Users,
    Calendar,
    Briefcase,
    Target,
    Mail,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import UpgradePlanModal from '@/components/ui/UpgradePlanModal';
import { cn } from '@/lib/utils';


const CreateProjectForm = ({ onSuccess, onCancel }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [managers, setManagers] = useState([]);
    const { toast } = useToast();
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientId: '',
        managerId: user?.role === 'MANAGER' ? user.id : '',
        startDate: null,
        endDate: null,
        isOngoing: false,
        totalBudget: '',
        status: 'PLANNING',
        category: 'INTERNAL',
        sendEmail: localStorage.getItem('preferNoEmail') !== 'true',
        allowMemberTaskCreation: false,
    });
    const [loading, setLoading] = useState(false);
    const [existingProjectNames, setExistingProjectNames] = useState([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchExistingProjects();
    }, []);

    const fetchExistingProjects = async () => {
        try {
            const response = await api.get('/projects');
            const projects = Array.isArray(response.data) ? response.data : response.data.data || [];
            setExistingProjectNames(projects.map(p => p.name.trim().toLowerCase()));
        } catch (error) {
            console.error('Failed to fetch existing projects:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);

            // Filter clients and managers
            const clientUsers = response.data.filter(u => u.role === 'CLIENT');
            let managerUsers = response.data.filter(u => u.role === 'MANAGER');

            if (user?.role === 'MANAGER') {
                managerUsers = managerUsers.filter(u => u.id === user.id);
            }

            setClients(clientUsers);
            setManagers(managerUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedName = formData.name.trim();
        if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 30) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Project Name must be between 3 and 30 characters",
            });
            return;
        }

        if (/^\d/.test(trimmedName)) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Project Name cannot start with a number",
            });
            return;
        }

        const isAlphanumeric = (char) => /^[a-zA-Z0-9]$/.test(char);
        if (!isAlphanumeric(trimmedName[0]) || !isAlphanumeric(trimmedName[trimmedName.length - 1])) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Project Name cannot start or end with a special character",
            });
            return;
        }
        if (!formData.startDate) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Start Date is required",
            });
            return;
        }

        if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "End Date must be after Start Date",
            });
            return;
        }
        if (formData.totalBudget && parseFloat(formData.totalBudget) < 0) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Budget cannot be negative",
            });
            return;
        }
        if (formData.description && formData.description.length > 1000) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Description cannot exceed 1000 characters",
            });
            return;
        }

        // Frontend duplicate name check
        if (existingProjectNames.includes(formData.name.trim().toLowerCase())) {
            toast({
                variant: "destructive",
                title: "Duplicate Project Name",
                description: "A project with this name already exists in your organization.",
            });
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...formData,
                category: formData.clientId ? 'CLIENT' : 'INTERNAL',
                totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : null,
                startDate: formData.startDate ? format(new Date(formData.startDate), 'yyyy-MM-dd') : null,
                endDate: formData.endDate ? format(new Date(formData.endDate), 'yyyy-MM-dd') : null,
                allowMemberTaskCreation: formData.allowMemberTaskCreation,
            };

            const response = await api.post('/projects', payload);
            if (onSuccess) {
                onSuccess(response.data);
            }
            toast({
                title: "Project created",
                description: "New project has been created successfully.",
            });
        } catch (error) {
            console.error('Failed to create project:', error);

            if (error.response?.status === 403 && error.response?.data?.error?.includes('limit reached')) {
                setShowUpgradeModal(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.response?.data?.error || "Failed to create project",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                {/* Project Name - Full Width */}
                <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="name" className="text-foreground/90 font-semibold">Project Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter project name"
                            required
                            minLength={3}
                            maxLength={30}
                            className="!pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>


                <div className="space-y-2">
                    <Label htmlFor="status" className="text-foreground/90 font-semibold">Status</Label>
                    <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            options={[
                                { label: 'Planning', value: 'PLANNING' },
                                { label: 'Active', value: 'ACTIVE' },
                                { label: 'On Hold', value: 'ON_HOLD' },
                                { label: 'Completed', value: 'COMPLETED' },
                                { label: 'Cancelled', value: 'CANCELLED' }
                            ]}
                            value={formData.status}
                            onChange={(value) => setFormData({ ...formData, status: value })}
                            placeholder="Select Status"
                            className="!pl-10 relative"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="manager" className="text-foreground/90 font-semibold">Project Manager</Label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            options={managers.map(m => ({ label: m.name, value: m.id }))}
                            value={formData.managerId}
                            onChange={(value) => setFormData({ ...formData, managerId: value })}
                            placeholder="Select Manager (Opt)"
                            className="!pl-10 relative"
                        />
                    </div>
                </div>

                {/* Client field - always show now that Type is gone, or keep it optional? 
                    The previous logic showed it only if category === 'CLIENT'.
                    I will change it to always show, as it's the only way to make a project "Client".
                */}
                <div className="space-y-2 transition-all duration-200">
                    <Label htmlFor="client" className="text-foreground/90 font-semibold">Client</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                        <SearchableSelect
                            options={clients.map(c => ({ label: c.name, value: c.id }))}
                            value={formData.clientId}
                            onChange={(value) => setFormData({ ...formData, clientId: value })}
                            placeholder="Select Client"
                            className="!pl-10 relative"
                        />
                    </div>
                </div>

                {/* Row 3: Dates & Budget */}
                <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-foreground/90 font-semibold">Start Date <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <DatePicker
                            date={formData.startDate}
                            setDate={(date) => setFormData({ ...formData, startDate: date })}
                            placeholder="Select start date"
                            className=""
                        />
                    </div>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="endDate" className="text-foreground/90 font-semibold">End Date</Label>
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="isOngoing" className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">Ongoing</Label>
                            <Switch
                                id="isOngoing"
                                className="scale-75"
                                checked={formData.isOngoing}
                                onCheckedChange={(val) => setFormData({ ...formData, isOngoing: val, endDate: val ? null : formData.endDate })}
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <DatePicker
                            date={formData.endDate}
                            setDate={(date) => setFormData({ ...formData, endDate: date })}
                            disabled={formData.isOngoing}
                            placeholder="Select end date"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="totalBudget" className="text-foreground/90 font-semibold">Total Budget (₹)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground/70">₹</span>
                        <Input
                            id="totalBudget"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.totalBudget}
                            onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                            placeholder="0.00"
                            className="!pl-8 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Description - Full Width */}
                <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="description" className="text-foreground/90 font-semibold">Description</Label>
                    <div className="relative">
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Enter project description"
                        />
                    </div>
                </div>
            </div>

            {/* Member Task Creation Toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50 mt-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <Label htmlFor="allowMemberTaskCreation" className="text-sm font-semibold cursor-pointer">Allow Members to Create Tasks</Label>
                        <p className="text-xs text-muted-foreground">Members of this project can create tasks</p>
                    </div>
                </div>
                <Switch
                    id="allowMemberTaskCreation"
                    checked={formData.allowMemberTaskCreation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowMemberTaskCreation: checked })}
                />
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
                            <p className="text-xs text-muted-foreground">Notify manager and client about this project</p>
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


            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 sm:pt-6 border-t mt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="w-full sm:w-auto h-10 font-bold rounded-xl"
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 font-bold rounded-xl px-8">
                    {loading ? 'Creating...' : 'Create Project'}
                </Button>
            </div>
            <UpgradePlanModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                limitType="projects"
            />
        </form>
    );
};

export default CreateProjectForm;