import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileText,
    Users,
    Calendar,
    DollarSign,
    Briefcase,
    Target,
    AlignLeft
} from 'lucide-react';

const CreateProjectForm = ({ onSuccess, onCancel }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [managers, setManagers] = useState([]);
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
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create project: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter project description"
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                                rows={5}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="client" className="text-gray-700 font-medium">Client</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                id="client"
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">Select Client (Optional)</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="manager" className="text-gray-700 font-medium">Project Manager</Label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                id="manager"
                                value={formData.managerId}
                                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">Select Manager (Optional)</option>
                                {managers.map((manager) => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-gray-700 font-medium">Status</Label>
                        <div className="relative">
                            <Target className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Dates & Budget - Spanning columns if needed or just filling grid */}
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
