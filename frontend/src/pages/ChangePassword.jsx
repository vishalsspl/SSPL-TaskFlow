import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';

const ChangePassword = () => {
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast({
                title: "Passwords don't match",
                description: "New password and confirmation must match.",
                variant: "destructive",
            });
            return;
        }

        if (formData.newPassword.length < 6) {
            toast({
                title: "Password too short",
                description: "New password must be at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully. You can now access your dashboard.",
            });

            // Update local user state
            updateUser({ ...user, mustChangePassword: false });

            // Redirect based on role
            if (user.role === 'CLIENT') {
                navigate('/task-board');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Change password failed:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to change password. Please check your current password.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Security Update</h1>
                    <p className="mt-2 text-slate-400">
                        For your security, you must set a new password before continuing.
                    </p>
                </div>

                <Card className="border-slate-800 bg-[#1E293B] shadow-xl">
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription className="text-slate-400">
                            Please enter your current demo password and choose a new secure one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        required
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        className="pl-10 bg-[#0F172A] border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        required
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        className="pl-10 bg-[#0F172A] border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="pl-10 bg-[#0F172A] border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-6"
                                disabled={loading}
                            >
                                {loading ? 'Updating...' : (
                                    <>
                                        Update Password <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-slate-500">
                    Logged in as <span className="text-slate-300 font-medium">{user?.email}</span>
                </p>
            </div>
        </div>
    );
};

export default ChangePassword;
