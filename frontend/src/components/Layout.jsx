import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  Plus,
  PanelLeftClose,
  PanelLeft,
  Clock,
  CheckCircle2, AlertTriangle, TrendingUp,
  Target, Zap, BarChart2, DollarSign, User as UserIcon,
  BarChart3,
  Building2,
  History,
  CreditCard,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useHeaderStore } from '@/store/headerStore';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';
import GlobalTimer from '@/components/GlobalTimer';
import { useTimerStore } from '@/store/timerStore';
import api from '@/lib/api';
import { Timer as TimerIcon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const { totalUnread, isConnected } = useChatStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { title, description, searchTerm, setSearchTerm, showSearch, searchPlaceholder } = useHeaderStore();
  const { activeTaskId, isRunning, setRecorderOpen, autoSaveWorklog, saveWorklog } = useTimerStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme, setTheme } = useTheme();

  // Timer protection: Handle window close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning) {
        // Attempt silent auto-save
        autoSaveWorklog('Browser Close/Refresh');

        // Trigger browser confirmation dialog
        e.preventDefault();
        e.returnValue = 'You have an active timer running. It will be automatically submitted if you leave.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, autoSaveWorklog]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log('Layout Notification Status:', { totalUnread, isConnected, path: location.pathname });
  }, [totalUnread, isConnected, location.pathname]);

  // Auto-collapse sidebar on Kanban board, expand otherwise
  useEffect(() => {
    setIsSidebarOpen(location.pathname !== '/task-board');
  }, [location.pathname]);

  if (user?.mustChangePassword && user?.role !== 'ADMIN') {
    return <Navigate to="/change-password" replace />;
  }

  // ── NEW: block SUPERADMIN from the regular layout ──────────────────────
  if (user?.role === 'SUPERADMIN') {
    return <Navigate to="/superadmin" replace />;
  }

  const handleLogout = async () => {
    if (isRunning) {
      setShowLogoutConfirm(true);
      return;
    }
    logout(api);
    navigate('/login');
  };

  const confirmLogoutAndSave = async () => {
    await saveWorklog('Logout');
    setShowLogoutConfirm(false);
    logout(api);
    navigate('/login');
  };
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permKey: 'dashboard.view' },
    { name: 'Projects', href: '/projects', icon: FolderKanban, featureKey: 'projects', permKey: 'projects.view' },
    { name: 'Kanban Board', href: '/task-board', icon: Kanban, featureKey: 'kanban', permKey: 'kanban.view' },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare, featureKey: 'tasks', permKey: 'tasks.view' },
    {
      name: 'Tickets',
      href: '/tickets',
      icon: LifeBuoy,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER', 'CLIENT'],
      featureKey: 'tickets',
      permKey: 'tickets.view'
    },
    {
      name: 'Team',
      href: '/team',
      icon: Users,
      allowedRoles: ['ADMIN', 'MANAGER'],
      featureKey: 'team',
      permKey: 'team.view'
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
      featureKey: 'chat',
      permKey: 'chat.view'
    },
    {
      name: 'Performance',
      href: '/performance',
      icon: BarChart2,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
      featureKey: 'performance',
      permKey: 'performance.viewOwn,performance.viewAll'
    },
    {
      name: 'Timesheets',
      href: '/timesheets',
      icon: Clock,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
      featureKey: 'timesheets',
      permKey: 'timesheets.view'
    },
    {
      name: 'Activity Logs',
      href: '/organization/activity-log',
      icon: History,
      allowedRoles: ['ADMIN'],
    },
    {
      name: 'Manage Access',
      href: '/organization/access',
      icon: ShieldCheck,
      allowedRoles: ['ADMIN'],
    },
    {
      name: 'Integrations',
      href: '/integrations',
      icon: Zap,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
      featureKey: 'github',
      permKey: 'integrations.view'
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: CreditCard,
      allowedRoles: ['ADMIN'],
    },
  ];


  const isActive = (path) => location.pathname.startsWith(path);

  const NavContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo - click to toggle sidebar */}
      <div
        className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-2 px-4' : 'justify-center'} h-16 cursor-pointer`}
        onClick={() => !isMobile && setIsSidebarOpen(!isSidebarOpen)}
        title={(isMobile || isSidebarOpen) ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {user?.organization?.logoUrl ? (
          <img src={user.organization.logoUrl} alt="Logo" className="h-12 w-12 object-contain shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {user?.organization?.name?.charAt(0) || 'T'}
          </div>
        )}
        {(isMobile || isSidebarOpen) && (
          <div className="flex flex-col items-center text-center px-1 max-w-[120px] overflow-visible">
            <span
              className={`font-extrabold bg-gradient-to-r from-[#48A111] via-[#A3E635] to-[#48A111] bg-clip-text text-transparent tracking-tight whitespace-normal break-words leading-tight ${(user?.organization?.name?.length || 0) > 25 ? 'text-[10px]' :
                  (user?.organization?.name?.length || 0) > 15 ? 'text-xs' :
                    'text-sm'
                }`}
              title={user?.organization?.name || 'TaskFlow'}
            >
              {user?.organization?.name || 'TaskFlow'}
            </span>
          </div>
        )}
      </div>

      <Separator />

      <nav className="flex-1 px-4 pt-4 space-y-1 overflow-y-auto no-scrollbar">
        {navigation
          .filter(item => {
            // Admin only features (Internal Admin config)
            if (item.adminOnly && user?.role !== 'ADMIN') return false;

            // Role based filtering
            if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;

            // Feature based filtering (Enforced by Plan)
            if (item.featureKey) {
              const activeFeatures = user?.activeFeatures || user?.organization?.activeFeatures || user?.organization?.customFeatures;

              // ── DEEP SYNC: Convert everything to lowercase to ensure absolute match ──────────
              if (activeFeatures) {
                const normalizedFeatures = {};
                Object.keys(activeFeatures).forEach(k => {
                  normalizedFeatures[k.toLowerCase()] = activeFeatures[k];
                });

                // If explicitly disabled, hide it immediately
                if (normalizedFeatures[item.featureKey.toLowerCase()] === false) return false;
              }
            }

            // Granular Permission based filtering (from Manage Access)
            if (item.permKey && user?.role !== 'ADMIN') {
              if (user?.permissions) {
                const keys = item.permKey.split(',');
                const hasAnyAccess = keys.some(key => user.permissions[key] !== false);
                if (!hasAnyAccess) {
                  return false;
                }
              }
            }

            return true;
          })
          .map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={!isSidebarOpen ? item.name : undefined}
            >
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={`w-full justify-start mb-1 ${(isMobile || isSidebarOpen) ? '' : 'justify-center px-0'} ${isActive(item.href) ? "font-semibold bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
              >
                <item.icon className={`w-4 h-4 ${(isMobile || isSidebarOpen) ? 'mr-3' : ''}`} />
                {(isMobile || isSidebarOpen) && item.name}
              </Button>
            </Link>
          ))}
      </nav>

      <Separator className="mt-4 mb-4" />

      {/* User Profile */}
      <div className={(isMobile || isSidebarOpen) ? "px-4" : "px-0 w-full flex justify-center"}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={`w-full ${(isMobile || isSidebarOpen) ? 'justify-start' : 'justify-center px-0'} h-auto py-3 px-2 hover:bg-transparent whitespace-normal`}>
              <div className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-3 w-full text-left' : 'justify-center'}`}>
                <Avatar className="w-8 h-8 border shrink-0">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {(isMobile || isSidebarOpen) && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setIsMobileOpen(false); navigate('/settings'); }}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            {/* ── NEW: Organisation quick link for ADMIN ─────────────────── */}
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem onClick={() => { setIsMobileOpen(false); navigate('/organization'); }}>
                <Building2 className="w-4 h-4 mr-2" />
                Organisation
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-auto px-4 pb-4">
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${isSidebarOpen ? 'w-52' : 'w-16'} flex-col border-r border-border bg-card transition-all duration-300 shrink-0`}>
        <NavContent />
      </aside>

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl z-20 flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
          <div className="md:hidden flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-hidden">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/5 rounded-xl">
                  <Menu className="w-5 h-5 text-gray-400" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r border-border bg-card">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Access dashboard, projects, tasks and other workspace features.</SheetDescription>
                </SheetHeader>
                <NavContent isMobile={true} />
              </SheetContent>
            </Sheet>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-semibold text-foreground Montserrat tracking-tight truncate">
                {title || 'TaskFlow'}
              </span>
              {description && (
                <span className="text-[9px] text-muted-foreground Montserrat font-medium uppercase tracking-wider line-clamp-1 mt-0.5">
                  {description}
                </span>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-col min-w-0 flex-1 items-baseline gap-1">
            <h1 className="text-lg font-bold Montserrat tracking-tight text-foreground truncate">
              {title || 'TaskFlow'}
            </h1>
            {description && (
              <p className="text-[9px] text-muted-foreground Montserrat font-medium uppercase tracking-wider line-clamp-1">
                {description}
              </p>
            )}
          </div>

          {/* Global Search Center / Date & Time Display */}
          <div className="hidden lg:flex flex-1 justify-center max-w-md mx-4">
            {showSearch ? (
              <div className="relative w-full group overflow-visible">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors z-10" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-10 sm:pl-10 rounded-2xl bg-secondary/30 border-white/5 focus:bg-secondary/50 focus:border-primary/30 transition-all Montserrat text-sm shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex flex-col items-center px-4 py-2 hover:bg-accent/50 rounded-2xl transition-all duration-300 group border border-transparent hover:border-border/50 h-auto"
                  >
                    <div className="text-center hidden xl:block">
                      <p className="text-sm font-bold Montserrat text-foreground leading-none">
                        {format(currentTime, 'PPPP')}
                      </p>
                      <p className="text-[10px] font-medium Montserrat text-muted-foreground mt-1 uppercase tracking-wider">
                        {format(currentTime, 'p')} • TaskFlow Timeline
                      </p>
                    </div>
                    <div className="text-center xl:hidden">
                      <p className="text-sm font-bold Montserrat text-foreground leading-none">
                        {format(currentTime, 'PPP')}
                      </p>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border shadow-2xl rounded-2xl" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={currentTime}
                    onSelect={(date) => date && setCurrentTime(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {activeTaskId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRecorderOpen(true)}
                className={cn(
                  "relative hover:bg-primary/10 rounded-xl transition-all",
                  isRunning ? "text-primary animate-pulse" : "text-muted-foreground"
                )}
                title="Open timer recorder"
              >
                <TimerIcon className="w-5 h-5" />
                {isRunning && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hover:bg-primary/10 rounded-xl transition-all text-muted-foreground hover:text-primary"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {user?.role !== 'CLIENT' && <NotificationBell />}
          </div>
        </header>

        <GlobalTimer />

        {/* Main content */}
        <main className={`flex-1 ${location.pathname === '/task-board' || location.pathname === '/chat' ? 'overflow-hidden p-0' : 'overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:p-6'} transition-all duration-300`}>
          <Outlet />
        </main>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <TimerIcon className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <AlertDialogTitle>Active Timer Running</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              You have an active work session in progress. Logging out now will
              automatically submit your current progress to your timesheet.
              <span className="block mt-2 font-bold text-foreground">Are you sure you want to continue?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogoutAndSave} className="bg-primary hover:bg-primary/90 text-white">
              Confirm & Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Layout;