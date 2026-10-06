import { useState } from 'react';
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
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  User,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  Activity,
  Globe,
  Search,
  CreditCard,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { useHeaderStore } from '@/store/headerStore';
import api from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import { useTheme } from '@/components/ThemeProvider';

const SuperAdminLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { title, description, searchTerm, setSearchTerm, showSearch, searchPlaceholder } = useHeaderStore();
  const { theme, setTheme } = useTheme();

  if (user?.role !== 'SUPERADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    logout(api);
    navigate('/login');
  };

  const navGroups = [
    {
      label: 'MAIN',
      items: [
        { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
        { name: 'Organizations', href: '/superadmin/orgs', icon: Building2 },
        { name: 'All Users', href: '/superadmin/users', icon: Users },
      ]
    },
    {
      label: 'ANALYTICS & BILLING',
      items: [
        { name: 'Billing', href: '/superadmin/billing', icon: CreditCard },
        { name: 'Plans & Limits', href: '/superadmin/plans', icon: Zap },
        { name: 'Activity Log', href: '/superadmin/audit', icon: Activity },
      ]
    },
    {
      label: 'My Account',
      items: [
        { name: 'Platform Settings', href: '/superadmin/settings', icon: Globe },
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/superadmin') return location.pathname === '/superadmin';
    return location.pathname.startsWith(path);
  };

  const NavContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand / Logo Area */}
      <div
        className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-3 px-6' : 'justify-center px-0'} h-20 cursor-pointer group transition-all shrink-0`}
        onClick={() => !isMobile && setIsSidebarOpen(!isSidebarOpen)}
      >
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-[0_0_15px_rgba(var(--primary),0.5)] shrink-0 transition-transform duration-300 group-hover:scale-105">
          <ShieldCheck className="w-5 h-5" />
        </div>
        {(isMobile || isSidebarOpen) && (
          <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-lg font-bold text-foreground leading-tight tracking-tight">TaskFlow</span>
            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Platform Admin</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {(isMobile || isSidebarOpen) && (
              <span className="px-4 text-[10px] font-bold text-muted-foreground/70 tracking-[0.2em] mb-2">
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  title={!isSidebarOpen ? item.name : undefined}
                  className="relative flex items-center"
                >
                  {/* Left Border Indicator */}
                  {active && (isMobile || isSidebarOpen) && (
                    <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.6)] z-10" />
                  )}
                  <Button
                    variant="ghost"
                    className={`w-full relative h-10 rounded-lg transition-all duration-200 group
                    ${(isMobile || isSidebarOpen) ? 'px-4 justify-start' : 'justify-center px-0'}
                    ${active
                      ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/15 hover:text-primary'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 transition-all duration-200 ${(isMobile || isSidebarOpen) ? 'mr-3' : ''} ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    {(isMobile || isSidebarOpen) && (
                      <span className="text-sm tracking-tight truncate flex-1 text-left">
                        {item.name}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full h-auto py-3 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 group
                ${(isMobile || isSidebarOpen) ? 'justify-start px-3 rounded-xl bg-secondary/30 shadow-sm' : 'justify-center px-0 rounded-xl'}
              `}
            >
              <div className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-3' : ''} text-left w-full`}>
                <Avatar className="w-9 h-9 ring-2 ring-background shadow-sm shrink-0 transition-transform group-hover:scale-105">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {(isMobile || isSidebarOpen) && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">Super Admin</p>
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/50 bg-background/95 backdrop-blur-xl p-2" forceMount>
            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground px-2 pt-2 pb-1.5">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-1 my-1 opacity-50" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 rounded-lg cursor-pointer py-2.5 font-medium text-sm transition-all mt-1"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden font-sans">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex ${isSidebarOpen ? 'w-64' : 'w-20'} flex-col border-r border-border/40 bg-gradient-to-b from-card/50 to-background shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all duration-300 shrink-0 z-30 backdrop-blur-xl`}>
        <NavContent />
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-950/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        {/* Header */}
        <header className="h-16 sm:h-20 border-b border-border/30 bg-background/70 backdrop-blur-2xl z-20 flex flex-col justify-center shrink-0 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between px-4 sm:px-8 w-full gap-4 h-full">
            <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
              {/* Mobile menu toggle */}
              <div className="md:hidden">
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-secondary/60 rounded-lg h-10 w-10 shrink-0">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72 border-r border-border/40 bg-background/95 backdrop-blur-2xl">
                    <SheetHeader className="sr-only">
                      <SheetTitle>SuperAdmin Navigation</SheetTitle>
                      <SheetDescription>Platform-level administrative controls and monitoring.</SheetDescription>
                    </SheetHeader>
                    <NavContent isMobile={true} />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Title section */}
              <div className="flex flex-col min-w-0 overflow-hidden py-1">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight truncate">
                  {title || 'Platform Admin'}
                </h1>
                {description && (
                  <p className="text-xs text-muted-foreground font-medium truncate opacity-80 hidden xs:block mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Global Search Center - Desktop Only */}
            {showSearch && (
              <div className="hidden sm:block flex-1 max-w-md mx-4 animate-in fade-in duration-300">
                  <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="w-full h-10 px-4 rounded-xl bg-background border border-border shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground hover:border-border/80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-[10px] font-semibold text-primary tracking-wide">System Operational</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:bg-secondary/60 rounded-full w-9 h-9 transition-all text-muted-foreground hover:text-foreground"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <div className="relative flex items-center justify-center">
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>

        {/* Global Search - Mobile Only */}
        {showSearch && (
          <div className="sm:hidden px-4 py-3 bg-background/50 backdrop-blur-lg border-b border-border/30 w-full animate-in slide-in-from-top-2">
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full h-10 px-4 rounded-xl bg-background border border-border shadow-sm focus:ring-2 focus:ring-primary/20 text-sm font-medium text-foreground placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all duration-300">
          <div className="mx-auto max-w-7xl h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;