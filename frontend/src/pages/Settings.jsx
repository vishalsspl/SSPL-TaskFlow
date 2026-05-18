import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { useTheme } from '@/components/ThemeProvider';
import { Monitor, Moon, Sun, Upload, User, Check, Mail, Shield, Building2, KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ROLE_CONFIG = {
  ADMIN: {
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.2)',
    text: '#A78BFA',
  },
  MANAGER: {
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.1)',
    border: 'rgba(14,165,233,0.2)',
    text: '#7DD3FC',
  },
  MEMBER: {
    color: '#10B981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
    text: '#6EE7B7',
  },
  CLIENT: {
    color: '#F43F5E',
    bg: 'rgba(244,63,94,0.1)',
    border: 'rgba(244,63,94,0.2)',
    text: '#FDA4AF',
  }
};

const demoAvatars = [
  'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  'https://ui-avatars.com/api/?name=Manager&background=6366F1&color=fff',
  'https://ui-avatars.com/api/?name=Member&background=10B981&color=fff',
  'https://ui-avatars.com/api/?name=User&background=F59E0B&color=fff',
  'https://ui-avatars.com/api/?name=Dev&background=8B5CF6&color=fff',
  'https://ui-avatars.com/api/?name=Design&background=EC4899&color=fff',
];

const Settings = () => {
  const { toast } = useToast();
  const { setHeader } = useHeaderStore();
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    setHeader("Settings", "Manage your account profile and application appearance");
  }, [setHeader]);
  const [activeTab, setActiveTab] = useState('profile');
  const { setTheme, theme } = useTheme();
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password state
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      const payload = { name: profileForm.name };
      if (user?.role === 'ADMIN') {
        payload.email = profileForm.email;
      }
      const response = await api.patch('/users/profile', payload);
      updateUser(response.data);
      toast({
        title: "Profile Updated",
        description: "Your profile details have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarSelect = async (avatarUrl) => {
    setLoading(true);
    try {
      const response = await api.patch('/users/profile', { avatar: avatarUrl });
      updateUser(response.data);
      setShowAvatarDialog(false);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleAvatarSelect(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };



  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ title: 'All fields required', description: 'Please fill in all password fields.', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'New password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Mismatch', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || 'Failed to change password. Please check your current password.', 
        variant: 'destructive' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 p-0 sm:p-2 pt-2 overflow-y-auto h-full space-y-8">
      <div className="mt-2"></div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="flex flex-row lg:flex-col gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5">
            <Button
              variant="none"
              className={`flex-1 lg:flex-none justify-start Montserrat font-bold h-12 px-5 rounded-xl transition-all duration-300 gap-3 ${activeTab === 'profile'
                ? 'shadow-xl'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
              style={activeTab === 'profile' ? {
                backgroundColor: ROLE_CONFIG[user?.role]?.bg || 'rgba(14,165,233,0.15)',
                color: ROLE_CONFIG[user?.role]?.color || '#0EA5E9',
                boxShadow: `0 8px 20px -6px ${ROLE_CONFIG[user?.role]?.bg || 'rgba(14,165,233,0.1)'}`,
                border: `1px solid ${ROLE_CONFIG[user?.role]?.border || 'rgba(14,165,233,0.3)'}`
              } : {}}
              onClick={() => setActiveTab('profile')}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-white/10' : ''}`}>
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">Profile</span>
            </Button>
            <Button
              variant="none"
              className={`flex-1 lg:flex-none justify-start Montserrat font-bold h-12 px-5 rounded-xl transition-all duration-300 gap-3 ${activeTab === 'appearance'
                ? 'shadow-xl'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
              style={activeTab === 'appearance' ? {
                backgroundColor: theme === 'light' ? 'rgba(72,161,17,0.15)' : theme === 'dark' ? 'rgba(139,92,246,0.15)' : 'rgba(14,165,233,0.15)',
                color: theme === 'light' ? '#48a111' : theme === 'dark' ? '#8B5CF6' : '#0EA5E9',
                boxShadow: `0 8px 20px -6px ${theme === 'light' ? 'rgba(72,161,17,0.1)' : theme === 'dark' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)'}`,
                border: `1px solid ${theme === 'light' ? 'rgba(72,161,17,0.3)' : theme === 'dark' ? 'rgba(139,92,246,0.3)' : 'rgba(14,165,233,0.3)'}`
              } : {}}
              onClick={() => setActiveTab('appearance')}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'appearance' ? 'bg-white/10' : ''}`}>
                <Monitor className="w-4 h-4" />
              </div>
              <span className="text-sm">Appearance</span>
            </Button>
            <Button
              variant="none"
              className={`flex-1 lg:flex-none justify-start Montserrat font-bold h-12 px-5 rounded-xl transition-all duration-300 gap-3 ${activeTab === 'security'
                ? 'shadow-xl'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
              style={activeTab === 'security' ? {
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
                boxShadow: '0 8px 20px -6px rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)'
              } : {}}
              onClick={() => setActiveTab('security')}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'security' ? 'bg-white/10' : ''}`}>
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-sm">Security</span>
            </Button>
          </nav>
        </aside>

        <div className="flex-1 lg:max-w-2xl">
          <div className="space-y-6">
            {activeTab === 'profile' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                      This is how others will see you on the site.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                      <Avatar
                        className="h-24 w-24 border-4 border-card ring-2 shadow-2xl transition-all duration-500 hover:scale-105"
                        style={{ ringColor: ROLE_CONFIG[user?.role]?.color || '#10B981' }}
                      >
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback
                          style={{
                            backgroundColor: ROLE_CONFIG[user?.role]?.bg || 'rgba(16,185,129,0.1)',
                            color: ROLE_CONFIG[user?.role]?.color || '#10B981'
                          }}
                          className="text-3xl font-black Montserrat"
                        >
                          {user?.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="none"
                          className="bg-secondary hover:bg-accent text-foreground border border-border h-10 px-6 rounded-xl font-bold Montserrat transition-all"
                          onClick={() => setShowAvatarDialog(true)}
                        >
                          Change Avatar
                        </Button>
                        <p className="text-[10px] text-muted-foreground ml-1">
                          Personalize your identity
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-foreground/90 font-semibold">Full Name</Label>
                        <div className="relative">
                          <Input 
                            value={profileForm.name} 
                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} 
                            className="px-4 h-12" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/90 font-semibold flex items-center justify-between">
                          <span>Email Address</span>
                          {user?.role !== 'ADMIN' && <span className="text-[10px] text-muted-foreground font-normal">Contact Admin to change</span>}
                        </Label>
                        <div className="relative">
                          <Input 
                            value={profileForm.email} 
                            onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} 
                            readOnly={user?.role !== 'ADMIN'}
                            className={`px-4 h-12 ${user?.role !== 'ADMIN' ? 'bg-muted/30 cursor-not-allowed opacity-70 border-dashed' : ''}`} 
                            title={user?.role !== 'ADMIN' ? 'Only Admins can change their email address' : ''}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/90 font-semibold">Account Role</Label>
                        <div className="relative">
                          <div className="px-4 h-12 flex items-center border border-input rounded-md bg-muted/30">
                            <Badge
                              className="text-[10px] font-black tracking-widest uppercase rounded-sm px-2.5 py-1"
                              style={{
                                backgroundColor: ROLE_CONFIG[user?.role]?.bg || 'rgba(16,185,129,0.1)',
                                color: ROLE_CONFIG[user?.role]?.color || '#10B981',
                                border: `1px solid ${ROLE_CONFIG[user?.role]?.border || 'rgba(16,185,129,0.2)'}`
                              }}
                            >
                              {user?.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      </div>
                      <div className="pt-4 flex justify-end">
                        <Button 
                          onClick={handleProfileSave} 
                          disabled={isSavingProfile || (profileForm.name === user?.name && profileForm.email === user?.email)}
                          className="px-8 font-bold Montserrat rounded-xl"
                        >
                          {isSavingProfile ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                  </CardContent>
                </Card>


              </>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize the appearance of the application. Automatically switch between day and night themes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground mb-6">
                      Select the theme for the dashboard.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Light Theme Option */}
                      <button
                        onClick={() => setTheme('light')}
                        className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'light'
                          ? 'border-primary bg-primary/5 shadow-[0_0_40px_rgba(72,161,17,0.15)] scale-[1.02]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                          <div className="h-full w-full bg-[#f8fafc] p-2 flex flex-col gap-2">
                            <div className="h-1.5 w-12 rounded bg-slate-200" />
                            <div className="flex gap-2">
                              <div className="h-10 flex-1 rounded bg-white shadow-sm border border-slate-100" />
                              <div className="h-10 flex-1 rounded bg-white shadow-sm border border-slate-100" />
                            </div>
                            <div className="h-full w-full rounded bg-white shadow-sm border border-slate-100" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground'}`}>
                              <Sun className="h-4 w-4" />
                            </div>
                            <span className={`font-bold Montserrat text-sm ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>Light</span>
                          </div>
                          {theme === 'light' && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Dark Theme Option */}
                      <button
                        onClick={() => setTheme('dark')}
                        className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'dark'
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_40px_rgba(139,92,246,0.15)] scale-[1.02]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                          <div className="h-full w-full bg-slate-950 p-2 flex flex-col gap-2">
                            <div className="h-1.5 w-12 rounded bg-slate-800" />
                            <div className="flex gap-2">
                              <div className="h-10 flex-1 rounded bg-slate-900 border border-white/5" />
                              <div className="h-10 flex-1 rounded bg-slate-900 border border-white/5" />
                            </div>
                            <div className="h-full w-full rounded bg-slate-900 border border-white/5" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-muted-foreground'}`}>
                              <Moon className="h-4 w-4" />
                            </div>
                            <span className={`font-bold Montserrat text-sm ${theme === 'dark' ? 'text-[#8B5CF6]' : 'text-muted-foreground'}`}>Dark</span>
                          </div>
                          {theme === 'dark' && (
                            <div className="h-5 w-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                              <Check className="h-3 w-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* System Theme Option */}
                      <button
                        onClick={() => setTheme('system')}
                        className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'system'
                          ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 shadow-[0_0_40px_rgba(14,165,233,0.15)] scale-[1.02]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                          <div className="h-full w-full bg-slate-900/50 p-2 flex flex-col gap-2">
                            <div className="flex justify-between">
                              <div className="h-1.5 w-12 rounded bg-slate-700" />
                              <div className="h-1.5 w-8 rounded bg-slate-700" />
                            </div>
                            <div className="h-full w-full rounded-lg border border-white/10 overflow-hidden flex">
                              <div className="w-1/2 h-full bg-white opacity-20" />
                              <div className="w-1/2 h-full bg-black opacity-40" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg transition-colors ${theme === 'system' ? 'bg-[#0EA5E9] text-white' : 'bg-white/5 text-muted-foreground'}`}>
                              <Monitor className="h-4 w-4" />
                            </div>
                            <span className={`font-bold Montserrat text-sm ${theme === 'system' ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}>System</span>
                          </div>
                          {theme === 'system' && (
                            <div className="h-5 w-5 rounded-full bg-[#0EA5E9] flex items-center justify-center">
                              <Check className="h-3 w-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="rounded-3xl border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden group transition-all">
                <CardHeader className="p-8 pb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 shadow-inner transition-transform group-hover:scale-105">
                      <KeyRound className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold tracking-widest uppercase">Security Settings</CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest opacity-60 leading-tight uppercase">Update your account password and security options</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator className="bg-border/10" />
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6 max-w-xl">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-foreground/90 Montserrat">Current Password</Label>
                      <div className="relative group">
                        <Input 
                          type={showCurrentPw ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="••••••••"
                          className="h-14 px-6 rounded-2xl bg-background/50 border-border/40 font-bold placeholder:font-normal placeholder:text-muted-foreground/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-foreground/90 Montserrat">New Password</Label>
                      <div className="relative group">
                        <Input 
                          type={showNewPw ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="••••••••"
                          className="h-14 px-6 rounded-2xl bg-background/50 border-border/40 font-bold placeholder:font-normal placeholder:text-muted-foreground/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-foreground/90 Montserrat">Confirm New Password</Label>
                      <div className="relative group">
                        <Input 
                          type={showConfirmPw ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="h-14 px-6 rounded-2xl bg-background/50 border-border/40 font-bold placeholder:font-normal placeholder:text-muted-foreground/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button 
                        onClick={handlePasswordChange}
                        disabled={passwordLoading}
                        className="h-14 rounded-2xl px-10 bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-xl shadow-red-500/20 transition-all min-w-[180px]"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Avatar</DialogTitle>
            <DialogDescription>
              Upload a new photo or select a demo avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              <Avatar
                className="h-28 w-28 border-4 border-card ring-2 shadow-2xl transition-all duration-700"
                style={{ ringColor: ROLE_CONFIG[user?.role]?.color || '#10B981' }}
              >
                <AvatarImage src={user?.avatar} />
                <AvatarFallback
                  style={{
                    backgroundColor: ROLE_CONFIG[user?.role]?.bg || 'rgba(16,185,129,0.1)',
                    color: ROLE_CONFIG[user?.role]?.color || '#10B981'
                  }}
                  className="text-4xl font-black Montserrat"
                >
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-xs text-muted-foreground">Click below to upload or select a preset</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Demo Avatars</h4>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {demoAvatars.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative cursor-pointer rounded-full border-2 transition-all p-0.5 ${user?.avatar === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'}`}
                    onClick={() => handleAvatarSelect(url)}
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={url} />
                      <AvatarFallback className="bg-white/5 text-[10px] font-bold">PRESET</AvatarFallback>
                    </Avatar>
                    {user?.avatar === url && (
                      <div className="absolute -right-1 -top-1 bg-primary rounded-full p-1 text-primary-foreground shadow-lg border border-card">
                        <Check className="h-2.5 w-2.5 stroke-[4]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? 'Uploading...' : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAvatarDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;