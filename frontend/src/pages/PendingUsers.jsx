import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock } from 'lucide-react';

const PendingUsers = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null);

    useEffect(() => {
        // Only admins can access this page
        if (user?.role !== 'ADMIN') {
            navigate('/dashboard');
            return;
        }

        fetchPendingUsers();
    }, [user, navigate]);

    const fetchPendingUsers = async () => {
        try {
            const response = await api.get('/users?pending=true');
            setPendingUsers(response.data);
        } catch (error) {
            console.error('Error fetching pending users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        setApproving(userId);
        try {
            await api.put(`/users/${userId}/approve`);
            // Remove approved user from list
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        } finally {
            setApproving(null);
        }
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            ADMIN: 'bg-purple-100 text-purple-800',
            MANAGER: 'bg-blue-100 text-blue-800',
            MEMBER: 'bg-green-100 text-green-800',
            CLIENT: 'bg-orange-100 text-orange-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="p-6">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Pending User Approvals</h1>
                <p className="text-gray-600 mt-2">Review and approve new user signups</p>
            </div>

            {pendingUsers.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No pending user approvals</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingUsers.map((pendingUser) => (
                        <Card key={pendingUser.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-xl">{pendingUser.name}</CardTitle>
                                        <CardDescription className="mt-1">{pendingUser.email}</CardDescription>
                                    </div>
                                    <Badge className={getRoleBadgeColor(pendingUser.role)}>
                                        {pendingUser.role}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Clock className="w-4 h-4 mr-2" />
                                        Signed up {new Date(pendingUser.createdAt).toLocaleDateString()}
                                    </div>
                                    <Button
                                        onClick={() => handleApprove(pendingUser.id)}
                                        disabled={approving === pendingUser.id}
                                    >
                                        {approving === pendingUser.id ? 'Approving...' : 'Approve User'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PendingUsers;
