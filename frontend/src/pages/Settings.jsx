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

const demoAvatars = [
  'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  'https://ui-avatars.com/api/?name=Manager&background=6366F1&color=fff',
  'https://ui-avatars.com/api/?name=Member&background=10B981&color=fff',
  'https://ui-avatars.com/api/?name=User&background=F59E0B&color=fff',
  'https://ui-avatars.com/api/?name=Dev&background=8B5CF6&color=fff',
  'https://ui-avatars.com/api/?name=Design&background=EC4899&color=fff',
];

const Settings = () => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const { setTheme, theme } = useTheme();
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState(user?.organization?.name || '');
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarSelect = async (avatarUrl) => {
    setLoading(true);
    try {
      const response = await api.patch('/users/profile', { avatar: avatarUrl });
      updateUser(response.data);
      setShowAvatarDialog(false);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      alert('Failed to update avatar');
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
      alert('Organization updated successfully');
    } catch (error) {
      console.error('Failed to update organization:', error);
      alert('Failed to update organization');
    } finally {
      setUpdatingOrg(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>
      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <Button
              variant={activeTab === 'profile' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </Button>
            <Button variant="ghost" className="justify-start" disabled>Account</Button>
            <Button
              variant={activeTab === 'appearance' ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </Button>
            <Button variant="ghost" className="justify-start" disabled>Notifications</Button>
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
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2 border-muted">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-2xl font-bold">
                          {user?.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" onClick={() => setShowAvatarDialog(true)}>
                        Change Avatar
                      </Button>
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
                        <Badge variant="outline" className="text-xs uppercase px-2 py-0.5 font-semibold tracking-wider">
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
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <Label>Organization Name</Label>
                        <Input
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                        />
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={handleOrgUpdate}
                          disabled={updatingOrg || orgName === user?.organization?.name}
                        >
                          {updatingOrg ? 'Saving...' : 'Save Changes'}
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
                    <div className="grid max-w-md grid-cols-3 gap-8 pt-4">
                      <div onClick={() => setTheme('light')} className="cursor-pointer">
                        <div className={`items-center rounded-md border-2 p-1 hover:border-accent ${theme === 'light' ? 'border-primary' : 'border-muted'}`}>
                          <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                            <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                          <Sun className="h-4 w-4" />
                          <span className="block w-full text-center font-normal text-sm">Light</span>
                        </div>
                      </div>

                      <div onClick={() => setTheme('dark')} className="cursor-pointer">
                        <div className={`items-center rounded-md border-2 p-1 hover:border-accent ${theme === 'dark' ? 'border-primary' : 'border-muted'}`}>
                          <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                          <Moon className="h-4 w-4" />
                          <span className="block w-full text-center font-normal text-sm">Dark</span>
                        </div>
                      </div>

                      <div onClick={() => setTheme('system')} className="cursor-pointer">
                        <div className={`items-center rounded-md border-2 p-1 hover:border-accent ${theme === 'system' ? 'border-primary' : 'border-muted'}`}>
                          <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-4 w-4 rounded-full bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                          <Monitor className="h-4 w-4" />
                          <span className="block w-full text-center font-normal text-sm">System</span>
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
              <Avatar className="h-24 w-24 border-2 border-primary">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-3xl">
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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={url} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    {user?.avatar === url && (
                      <div className="absolute -right-1 -top-1 bg-primary rounded-full p-0.5 text-primary-foreground shadow-sm">
                        <Check className="h-2.5 w-2.5" />
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
