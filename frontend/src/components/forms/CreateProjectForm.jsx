import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileText,
    Users,
    Calendar,
    DollarSign,
    Briefcase,

    Target
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import RichTextEditor from '@/components/ui/RichTextEditor';


const CreateProjectForm = ({ onSuccess, onCancel }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [managers, setManagers] = useState([]);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientId: '',
        managerId: '',
        startDate: '',
        endDate: '',
        totalBudget: '',
        status: 'PLANNING',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);

            // Filter clients and managers
            const clientUsers = response.data.filter(u => u.role === 'CLIENT');
            const managerUsers = response.data.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER');

            setClients(clientUsers);
            setManagers(managerUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : null,
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
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.error || "Failed to create project",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Project Name - Full Width */}
                <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">Project Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter project name"
                            required
                            className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Row 2: Client, Manager, Status */}
                <div className="space-y-2">
                    <Label htmlFor="client" className="text-gray-700 font-medium">Client</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />
                        <SearchableSelect
                            options={clients.map(c => ({ label: c.name, value: c.id }))}
                            value={formData.clientId}
                            onChange={(value) => setFormData({ ...formData, clientId: value })}
                            placeholder="Select Client (Opt)"
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="manager" className="text-gray-700 font-medium">Project Manager</Label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />
                        <SearchableSelect
                            options={managers.map(m => ({ label: m.name, value: m.id }))}
                            value={formData.managerId}
                            onChange={(value) => setFormData({ ...formData, managerId: value })}
                            placeholder="Select Manager (Opt)"
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className="text-gray-700 font-medium">Status</Label>
                    <div className="relative">
                        <Target className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />
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
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Row 3: Dates & Budget */}
                <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-gray-700 font-medium">Start Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-gray-700 font-medium">End Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="totalBudget" className="text-gray-700 font-medium">Total Budget</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            id="totalBudget"
                            type="number"
                            step="0.01"
                            value={formData.totalBudget}
                            onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                            placeholder="0.00"
                            className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Description - Full Width */}
                <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                    <div className="relative">
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Enter project description"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="hover:bg-gray-50"
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 shadow-md">
                    {loading ? 'Creating...' : 'Create Project'}
                </Button>
            </div>
        </form>
    );
};

export default CreateProjectForm;
