import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/ThemeProvider';
import { Monitor, Moon, Sun, Upload, User, Check } from 'lucide-react';
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
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const { setTheme, theme } = useTheme();
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState(user?.organization?.name || '');
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setUpdatingOrg(true);
          const response = await api.patch('/organizations', { logoUrl: reader.result });
          updateUser({
            ...user,
            organization: {
              ...user.organization,
              logoUrl: response.data.logoUrl
            }
          });
          toast({
            title: "Logo Updated",
            description: "Your organization logo has been updated successfully.",
          });
        } catch (error) {
          console.error('Failed to update logo:', error);
          toast({
            title: "Update Failed",
            description: "Failed to update organization logo.",
            variant: "destructive",
          });
        } finally {
          setUpdatingOrg(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrgUpdate = async () => {
    if (!orgName.trim()) return;
    setUpdatingOrg(true);
    try {
      const response = await api.patch('/organizations', { name: orgName });
      updateUser({
        ...user,
        organization: {
          ...user.organization,
          name: response.data.name
        }
      });
      toast({
        title: "Organization Updated",
        description: "Your organization details have been saved.",
      });
    } catch (error) {
      console.error('Failed to update organization:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update organization details.",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrg(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>
      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <Button
              variant="none"
              className={`justify-start Montserrat font-bold h-10 px-4 rounded-xl transition-all duration-300 ${activeTab === 'profile'
                ? 'ring-1 shadow-lg'
                : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
              style={activeTab === 'profile' ? {
                backgroundColor: ROLE_CONFIG[user?.role]?.bg || 'rgba(14,165,233,0.15)',
                color: ROLE_CONFIG[user?.role]?.color || '#0EA5E9',
                boxShadow: `0 0 20px ${ROLE_CONFIG[user?.role]?.bg || 'rgba(14,165,233,0.1)'}`,
                border: `1px solid ${ROLE_CONFIG[user?.role]?.border || 'rgba(14,165,233,0.3)'}`
              } : {}}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </Button>
            <Button
              variant="none"
              className={`justify-start Montserrat font-bold h-10 px-4 rounded-xl transition-all duration-300 ${activeTab === 'appearance'
                ? 'ring-1 shadow-lg'
                : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
              style={activeTab === 'appearance' ? {
                backgroundColor: theme === 'light' ? 'rgba(72,161,17,0.15)' : theme === 'dark' ? 'rgba(139,92,246,0.15)' : 'rgba(14,165,233,0.15)',
                color: theme === 'light' ? '#48a111' : theme === 'dark' ? '#8B5CF6' : '#0EA5E9',
                boxShadow: `0 0 20px ${theme === 'light' ? 'rgba(72,161,17,0.1)' : theme === 'dark' ? 'rgba(139,92,246,0.1)' : 'rgba(14,165,233,0.1)'}`,
                border: `1px solid ${theme === 'light' ? 'rgba(72,161,17,0.3)' : theme === 'dark' ? 'rgba(139,92,246,0.3)' : 'rgba(14,165,233,0.3)'}`
              } : {}}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
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
                        className="h-24 w-24 border-4 border-[#0A0A0A] ring-2 shadow-2xl transition-all duration-500 hover:scale-105"
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
                          className="bg-white/5 hover:bg-white/10 text-white border border-white/10 h-10 px-6 rounded-xl font-bold Montserrat transition-all"
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
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={user?.name} readOnly />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input value={user?.email} readOnly />
                    </div>
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <div className="flex items-center">
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
                  </CardContent>
                </Card>

                {user?.role === 'ADMIN' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Organization</CardTitle>
                      <CardDescription>
                        Manage your organization details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-8 py-2">
                        <div className="relative group">
                          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                          <div className="relative w-32 h-32 rounded-xl border border-white/10 flex items-center justify-center bg-[#0A0A0A] overflow-hidden shadow-2xl">
                            {user?.organization?.logoUrl ? (
                              <img src={user.organization.logoUrl} alt="Org Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                              <div className="text-primary font-black text-5xl Montserrat">
                                {user?.organization?.name?.charAt(0) || 'O'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <input
                            type="file"
                            ref={logoInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                          <Button
                            variant="none"
                            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 h-10 px-6 rounded-xl font-bold Montserrat transition-all"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={updatingOrg}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {user?.organization?.logoUrl ? 'Update Brand Logo' : 'Upload Brand Logo'}
                          </Button>
                          <p className="text-[10px] text-muted-foreground ml-1">
                            JPG, PNG or SVG. Max size of 2MB.
                          </p>
                        </div>
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="space-y-2">
                        <Label className="text-sm font-bold Montserrat ml-1">Company Name</Label>
                        <Input
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="bg-[#0D0D0D] border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl Montserrat font-medium"
                        />
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="none"
                          className={`w-full h-12 rounded-xl font-black Montserrat transition-all duration-300 ${updatingOrg || orgName === user?.organization?.name
                            ? 'bg-white/5 text-gray-700 cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:shadow-[0_0_30px_rgba(72,161,17,0.3)] hover:scale-[1.02]'}`}
                          onClick={handleOrgUpdate}
                          disabled={updatingOrg || orgName === user?.organization?.name}
                        >
                          {updatingOrg ? 'SAVING CHANGES...' : 'SAVE ORGANIZATION DETAILS'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                    <p className="text-sm text-muted-foreground">
                      Select the theme for the dashboard.
                    </p>
                    <div className="grid max-w-2xl grid-cols-3 gap-12 pt-6">
                      <div onClick={() => setTheme('light')} className="group flex flex-col items-center gap-3">
                        <div className={`cursor-pointer overflow-hidden items-center rounded-2xl border-2 p-1 transition-all duration-300 group-hover:scale-105 ${theme === 'light' ? 'border-primary shadow-[0_0_25px_rgba(72,161,17,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                          <div className="space-y-2 rounded-xl bg-[#ecedef] p-2">
                            <div className="space-y-2 rounded-lg bg-white p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg bg-white p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold Montserrat transition-colors ${theme === 'light' ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-white'}`}>
                          <Sun className="h-3.5 w-3.5" />
                          Light
                        </div>
                      </div>

                      <div onClick={() => setTheme('dark')} className="group flex flex-col items-center gap-3">
                        <div className={`cursor-pointer overflow-hidden items-center rounded-2xl border-2 p-1 transition-all duration-300 group-hover:scale-105 ${theme === 'dark' ? 'border-[#8B5CF6] shadow-[0_0_25px_rgba(139,92,246,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                          <div className="space-y-2 rounded-xl bg-slate-950 p-2">
                            <div className="space-y-2 rounded-lg bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold Montserrat transition-colors ${theme === 'dark' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'text-gray-500 hover:text-white'}`}>
                          <Moon className="h-3.5 w-3.5" />
                          Dark
                        </div>
                      </div>

                      <div onClick={() => setTheme('system')} className="group flex flex-col items-center gap-3">
                        <div className={`cursor-pointer overflow-hidden items-center rounded-2xl border-2 p-1 transition-all duration-300 group-hover:scale-105 ${theme === 'system' ? 'border-[#0EA5E9] shadow-[0_0_25px_rgba(14,165,233,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                          <div className="space-y-2 rounded-xl bg-slate-950 p-2">
                            <div className="space-y-2 rounded-lg bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold Montserrat transition-colors ${theme === 'system' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'text-gray-500 hover:text-white'}`}>
                          <Monitor className="h-3.5 w-3.5" />
                          System
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Avatar</DialogTitle>
            <DialogDescription>
              Upload a new photo or select a demo avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              <Avatar
                className="h-28 w-28 border-4 border-[#0A0A0A] ring-2 shadow-2xl transition-all duration-700"
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
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={url} />
                      <AvatarFallback className="bg-white/5 text-[10px] font-bold">PRESET</AvatarFallback>
                    </Avatar>
                    {user?.avatar === url && (
                      <div className="absolute -right-1 -top-1 bg-primary rounded-full p-1 text-primary-foreground shadow-lg border border-[#0A0A0A]">
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
