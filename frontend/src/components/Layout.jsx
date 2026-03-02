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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Automatically collapse sidebar only on task-board by default
  useEffect(() => {
    if (location.pathname === '/task-board') {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [location.pathname]);

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
      icon: MessageSquare,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER']
    },
  ];

  const getPageTitle = (path) => {
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/task-board')) return 'Kanban Board';
    if (path.startsWith('/tasks')) return 'Tasks';
    if (path.startsWith('/tickets')) return 'Tickets';
    if (path.startsWith('/team')) return 'Team';
    if (path.startsWith('/chat')) return 'Chat';
    if (path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/change-password')) return 'Change Password';
    return 'TaskFlow';
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const sidebarWidth = isSidebarCollapsed ? 'w-20' : 'w-52';

  const NavContent = ({ isCollapsed }) => (
    <div className="flex flex-col h-full py-4 transition-all duration-300 overflow-hidden">
      {/* Logo & Toggle */}
      <div className={`flex items-center gap-2 px-4 mb-6 ${isCollapsed ? 'justify-center' : ''}`}>
        <div
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {user?.organization?.logoUrl ? (
            <img src={user.organization.logoUrl} alt="Logo" className="h-10 w-10 object-contain min-w-[40px]" />
          ) : (
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg min-w-[40px]">
              {user?.organization?.name?.charAt(0) || 'T'}
            </div>
          )}
        </div>
        {!isCollapsed && (
          <span className="text-lg font-extrabold bg-gradient-to-r from-[#48A111] via-[#A3E635] to-[#48A111] bg-clip-text text-transparent tracking-tight whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            {user?.organization?.name || 'TaskFlow'}
          </span>
        )}
      </div>

      <Separator className="mb-4 opacity-10" />

      <nav className={`flex-1 px-3 space-y-1 transition-all ${isCollapsed ? 'items-center' : ''}`}>
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
                className={`w-full h-11 mb-1 transition-all group relative ${isCollapsed ? "justify-center px-0" : "justify-start"} ${isActive(item.href) ? "font-semibold bg-primary/10 text-primary hover:bg-primary/20" : "text-gray-400"}`}
              >
                <item.icon className={`h-5 w-5 shrink-0 transition-all ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && (
                  <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300 Montserrat font-bold uppercase text-[10px] tracking-widest">
                    {item.name}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-16 px-3 py-1.5 bg-black border border-white/10 text-white text-[10px] font-black Montserrat uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 shadow-2xl">
                    {item.name}
                  </div>
                )}
              </Button>
            </Link>
          ))}
      </nav>

      <Separator className="mt-4 mb-4 opacity-10" />

      {/* User Profile */}
      <div className={`px-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={`w-full h-auto py-2 hover:bg-white/5 transition-all ${isCollapsed ? "px-0 justify-center" : "px-2 justify-start whitespace-normal"}`}>
              <div className={`flex items-center gap-3 text-left ${isCollapsed ? 'justify-center' : 'w-full'}`}>
                <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <p className="text-sm font-bold leading-tight text-white Montserrat truncate">{user?.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest Montserrat">{user?.role?.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "start" : "end"} className="w-56 bg-[#0A0A0A] border-white/10 text-white Montserrat shadow-2xl" side={isCollapsed ? "right" : "bottom"}>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/5 cursor-pointer Montserrat font-bold">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:bg-red-500/10 cursor-pointer Montserrat font-bold">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-white/5 bg-[#0A0A0A] fixed h-full z-40 shadow-[10px_0_30px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out ${sidebarWidth}`}>
        <NavContent isCollapsed={isSidebarCollapsed} />
      </aside>

      {/* Shared Header for Desktop & Mobile */}
      <div className={`fixed top-0 right-0 left-0 h-16 border-b border-white/5 bg-[#0A0A0A]/60 backdrop-blur-xl z-30 flex items-center justify-between px-6 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:left-20' : 'md:left-52'}`}>
        <div className="md:hidden flex items-center gap-4">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/5 rounded-xl">
                <Menu className="w-5 h-5 text-gray-400" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-52 border-r border-white/5 bg-[#0A0A0A]">
              <NavContent isCollapsed={false} />
            </SheetContent>
          </Sheet>
          <span className="text-lg font-bold text-white Montserrat tracking-tight">
            {getPageTitle(location.pathname)}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all group"
          >
            <Menu className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
          </Button>
          <h1 className="text-xl font-bold text-white Montserrat tracking-tight animate-in fade-in duration-500">
            {getPageTitle(location.pathname)}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {user?.role !== 'CLIENT' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
              className="relative hover:bg-white/5 rounded-full transition-all p-2 h-10 w-10 flex items-center justify-center group"
            >
              <Bell className="w-6 h-6 text-[#00A3FF] transition-transform group-hover:scale-110" />
              {totalUnread > 0 && (
                <div className="absolute top-1 right-1">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-[#EE2D24] opacity-75"></span>
                  <div className="relative w-3 h-3 bg-[#EE2D24] rounded-full flex items-center justify-center ring-1 ring-[#0A0A0A]">
                    <span className="text-[7px] font-black text-white">{totalUnread > 9 ? '9+' : totalUnread}</span>
                  </div>
                </div>
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-1 ring-white/10 hover:ring-primary/50 transition-all overflow-hidden group">
                <Avatar className="w-9 h-9 transition-transform group-hover:scale-110">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold Montserrat uppercase">
                    {user?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0A0A0A] border-white/10 text-white Montserrat shadow-2xl" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold Montserrat">{user?.name}</p>
                  <p className="text-xs text-gray-500 Montserrat truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer transition-colors font-bold">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer transition-colors font-bold">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-52'} ${location.pathname === '/task-board' ? 'p-0' : 'p-6'} pt-16 min-h-screen overflow-y-auto custom-scroll`}>
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
