import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/ThemeProvider';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Settings = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const { setTheme, theme } = useTheme();

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
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-lg">{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Button variant="outline">Change Avatar</Button>
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
                      <Input value={user?.role} readOnly className="bg-muted text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {user?.organization && (
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
                        <Input value={user?.organization?.name} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label>Theme Color</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <div
                            className="w-10 h-10 rounded-md border shadow-sm"
                            style={{ backgroundColor: user?.organization?.themeColor }}
                          />
                          <Input value={user?.organization?.themeColor} readOnly className="w-[150px]" />
                        </div>
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
    </div>
  );
};

export default Settings;
