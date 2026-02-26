import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
  User,
  LifeBuoy,
  MessageSquare,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const { totalUnread, isConnected } = useChatStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    console.log('Layout Notification Status:', { totalUnread, isConnected, path: location.pathname });
  }, [totalUnread, isConnected, location.pathname]);

  if (user?.mustChangePassword && user?.role !== 'ADMIN') {
    return <Navigate to="/change-password" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Kanban Board', href: '/task-board', icon: Kanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    {
      name: 'Tickets',
      href: '/tickets',
      icon: LifeBuoy,
      allowedRoles: ['ADMIN', 'CLIENT']
    },
    {
      name: 'Team',
      href: '/team',
      icon: Users,
      allowedRoles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare
    },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 mb-6">
        {user?.organization?.logoUrl ? (
          <img src={user.organization.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
        ) : (
          <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {user?.organization?.name?.charAt(0) || 'T'}
          </div>
        )}
        <span className="text-xl font-extrabold bg-gradient-to-r from-[#48A111] via-[#A3E635] to-[#48A111] bg-clip-text text-transparent truncate tracking-tight">
          {user?.organization?.name || 'TaskFlow'}
        </span>
      </div>

      <Separator className="mb-4" />


      <nav className="flex-1 px-4 space-y-1">
        {navigation
          .filter(item => {
            if (item.allowedRoles) {
              return item.allowedRoles.includes(user?.role);
            }
            if (item.adminOnly) {
              return user?.role === 'ADMIN';
            }
            return true;
          })
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

      <div className="mt-auto px-4 pb-4">
        {/* Removed Notifications button from sidebar as per user request */}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-[#0A0A0A] fixed h-full z-30 shadow-2xl">
        <NavContent />
      </aside>

      {/* Shared Header for Desktop & Mobile */}
      <div className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl z-20 flex items-center justify-between px-6">
        <div className="md:hidden flex items-center gap-4">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/5 rounded-xl">
                <Menu className="w-5 h-5 text-gray-400" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r border-white/5 bg-[#0A0A0A]">
              <NavContent />
            </SheetContent>
          </Sheet>
          {/* Mobile Logo/Title */}
          <span className="text-lg font-black bg-gradient-to-r from-[#48A111] to-[#A3E635] bg-clip-text text-transparent Montserrat tracking-tighter">
            TaskFlow
          </span>
        </div>

        <div className="hidden md:block">
          {/* Breadcrumb or Page Title could go here */}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group overflow-visible">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log('Bell clicked, navigating to chat');
                navigate('/chat');
              }}
              className="relative hover:bg-white/5 rounded-full transition-all group p-2 h-12 w-12 overflow-visible"
            >
              <Bell className="w-8 h-8 text-[#00A3FF] fill-[#00A3FF]" />
              {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 z-50">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EE2D24] opacity-75"></span>
                  <div className="relative min-w-[22px] h-[22px] px-1 bg-[#EE2D24] text-[11px] font-black text-white rounded-full flex items-center justify-center ring-2 ring-[#0A0A0A] shadow-[0_0_15px_rgba(238,45,36,0.6)]">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </div>
                </div>
              )}
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 ring-1 ring-white/10 hover:ring-primary/50 transition-all">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0A0A0A] border-white/10 text-white Montserrat" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold Montserrat">{user?.name}</p>
                  <p className="text-xs text-gray-500 Montserrat truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <main className={`flex-1 md:ml-64 ${location.pathname === '/task-board' ? 'p-0' : 'p-6'} pt-20 animate-in fade-in duration-500`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
