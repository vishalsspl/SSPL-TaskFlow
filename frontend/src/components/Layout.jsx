import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  Presentation,
  FolderKanban,
  Kanban,
  Menu,
  User
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Kanban Board', href: '/task-board', icon: Kanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Team', href: '/team', icon: Users, adminOnly: false }, // Changed based on role check in map
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className="flex items-center px-6 mb-6">
        <div className="p-2 bg-primary rounded-lg mr-3">
          <Presentation className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">TaskFlow</span>
      </div>

      <Separator className="mb-4" />

      {/* Organization */}
      <div className="px-6 mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Organization</p>
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {user?.organization?.name?.charAt(0) || 'O'}
          </div>
          <span className="text-sm font-medium truncate">
            {user?.organization?.name || 'My Organization'}
          </span>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation
          .filter(item => !item.adminOnly || user?.role === 'ADMIN')
          .map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
            >
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={`w-full justify-start mb-1 ${isActive(item.href) ? "font-semibold bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.name}
              </Button>
            </Link>
          ))}
      </nav>

      <Separator className="mt-4 mb-4" />

      {/* User Profile */}
      <div className="px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-2 hover:bg-muted">
              <div className="flex items-center gap-3 text-left w-full">
                <Avatar className="w-8 h-8 border">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card fixed h-full z-30">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r">
              <NavContent />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-lg">TaskFlow</span>
        </div>
        <Avatar className="w-8 h-8">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-6 pt-20 md:pt-6 animate-in fade-in duration-500">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
