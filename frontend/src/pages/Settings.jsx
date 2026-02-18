import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Settings = () => {
  const { user } = useAuthStore();

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
            <Button variant="secondary" className="justify-start">Profile</Button>
            <Button variant="ghost" className="justify-start">Account</Button>
            <Button variant="ghost" className="justify-start">Appearance</Button>
            <Button variant="ghost" className="justify-start">Notifications</Button>
          </nav>
        </aside>

        <div className="flex-1 lg:max-w-2xl">
          <div className="space-y-6">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
