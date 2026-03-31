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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
 LayoutDashboard,
 Building2,
 Users,
 Settings,
 LogOut,
 Menu,
 User,
 Bell,
 PanelLeftClose,
 PanelLeft,
 ShieldCheck,
 Activity,
 Globe,
 Search,
 CreditCard,
 Zap,
} from 'lucide-react';
import { useHeaderStore } from '@/store/headerStore';

const SuperAdminLayout = () => {
 const { user, logout } = useAuthStore();
 const location = useLocation();
 const navigate = useNavigate();
 const [isMobileOpen, setIsMobileOpen] = useState(false);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const { title, description, searchTerm, setSearchTerm, showSearch, searchPlaceholder } = useHeaderStore();

 if (user?.role !== 'SUPERADMIN') {
 return <Navigate to="/dashboard" replace />;
 }

 const handleLogout = () => {
 logout();
 navigate('/login');
 };

 const navigation = [
 { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
 { name: 'Organizations', href: '/superadmin/orgs', icon: Building2 },
 { name: 'All Users', href: '/superadmin/users', icon: Users },
 { name: 'Billing', href: '/superadmin/billing', icon: CreditCard },
 { name: 'Plans & Limits', href: '/superadmin/plans', icon: Zap },
 { name: 'Activity Log', href: '/superadmin/audit', icon: Activity },
 { name: 'Settings', href: '/superadmin/settings', icon: Globe },
 ];

 const isActive = (path) => {
 if (path === '/superadmin') return location.pathname === '/superadmin';
 return location.pathname.startsWith(path);
 };

 const NavContent = ({ isMobile = false }) => (
 <div className="flex flex-col h-full overflow-hidden">
 <div
 className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-2 px-4' : 'justify-center'} h-16 cursor-pointer group transition-all`}
 onClick={() => !isMobile && setIsSidebarOpen(!isSidebarOpen)}
 >
 <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/40 shrink-0 group-hover:scale-105 transition-transform duration-300">
 <ShieldCheck className="w-6 h-6" />
 </div>
 {(isMobile || isSidebarOpen) && (
 <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
 <span className="text-base font-extrabold text-foreground leading-tight ">TaskFlow</span>
 <span className="text-[10px] font-semibold text-primary opacity-80 ">Platform Admin</span>
 </div>
 )}
 </div>

 <div className="px-4 mb-4">
 <Separator className="opacity-10" />
 </div>

 <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
 {navigation.map((item) => {
 const active = isActive(item.href);
 return (
 <Link
 key={item.name}
 to={item.href}
 onClick={() => setIsMobileOpen(false)}
 title={!isSidebarOpen ? item.name : undefined}
 >
 <Button
 variant={active ? "secondary" : "ghost"}
 className={`w-full justify-start mb-1 h-10 rounded-xl transition-all duration-300 group
 ${(isMobile || isSidebarOpen) ? 'px-4' : 'justify-center px-0'}
 ${active
 ? 'font-semibold bg-primary/10 text-primary hover:bg-primary/20'
 : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
 >
 <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${(isMobile || isSidebarOpen) ? 'mr-3' : ''}`} />
 {(isMobile || isSidebarOpen) && (
 <span className={`text-sm font-medium truncate flex-1 text-left`}>
 {item.name}
 </span>
 )}
 </Button>
 </Link>
 );
 })}
 </nav>

 <div className="px-4 mt-4">
 <Separator className="opacity-10" />
 </div>

 <div className="px-3 py-6">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="ghost"
 className={`w-full ${(isMobile || isSidebarOpen) ? 'justify-start px-3' : 'justify-center px-0'} h-16 hover:bg-primary/5 rounded-2xl transition-all group`}
 >
 <div className={`flex items-center ${(isMobile || isSidebarOpen) ? 'gap-3' : ''} text-left w-full`}>
 <Avatar className="w-8 h-8 ring-2 ring-primary/20 shrink-0 transition-transform group-hover:scale-110">
 <AvatarImage src={user?.avatar} />
 <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold ">
 {user?.name?.charAt(0) || <User className="w-4 h-4" />}
 </AvatarFallback>
 </Avatar>
 {(isMobile || isSidebarOpen) && (
 <div className="flex-1 min-w-0">
 <p className="text-xs font-bold text-foreground leading-tight truncate ">{user?.name}</p>
 <p className="text-[9px] text-primary font-bold tracking-widest mt-1 opacity-70">Super Administrator</p>
 </div>
 )}
 </div>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-2xl border-border/40 bg-background/95 backdrop-blur-xl p-2" forceMount>
 <DropdownMenuLabel className="font-bold text-[10px] text-primary tracking-widest px-3 pt-3 pb-2 opacity-70">
 Account
 </DropdownMenuLabel>
 <DropdownMenuSeparator className="bg-primary/10 mx-2 my-2" />
 <DropdownMenuItem
 onClick={handleLogout}
 className="text-red-500 focus:text-white focus:bg-red-500 rounded-xl cursor-pointer py-3 font-bold text-[10px] tracking-widest transition-all"
 >
 <LogOut className="w-4 h-4 mr-3" />
 <span>Log Out</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 );

 return (
 <div className="h-screen w-full bg-background flex overflow-hidden">
 {/* Desktop sidebar */}
 <aside className={`hidden md:flex ${isSidebarOpen ? 'w-52' : 'w-16'} flex-col border-r border-border bg-card shadow-2xl transition-all duration-300 shrink-0 z-30`}>
 <NavContent />
 </aside>

 {/* Content */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
 {/* Header */}
 <header className="h-16 border-b border-border/40 bg-white/80 dark:bg-black/60 backdrop-blur-2xl z-20 flex items-center justify-between px-4 sm:px-6 shrink-0">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 {/* Mobile menu toggle */}
 <div className="md:hidden">
 <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
 <SheetTrigger asChild>
 <Button variant="ghost" size="icon" className="hover:bg-accent rounded-xl h-10 w-10">
 <Menu className="w-5 h-5" />
 </Button>
 </SheetTrigger>
 <SheetContent side="left" className="p-0 w-72 border-r border-border/40 bg-background/95 backdrop-blur-xl">
 <NavContent isMobile={true} />
 </SheetContent>
 </Sheet>
 </div>

 {/* Title section */}
 <div className="flex flex-col min-w-0">
 <h1 className="text-sm sm:text-lg font-bold text-foreground truncate ">
 {title || 'Platform Admin'}
 </h1>
 {description && (
 <p className="text-[9px] text-muted-foreground font-medium truncate opacity-70 ">
 {description}
 </p>
 )}
 </div>
 </div>

 {/* Global Search Center */}
 {showSearch && (
 <div className="hidden lg:flex flex-1 max-w-md mx-4 overflow-visible">
 <div className="relative w-full group overflow-visible">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors z-10" />
 <Input
 type="search"
 placeholder={searchPlaceholder}
 className="w-full h-10 pl-10 sm:pl-10 rounded-2xl bg-secondary/30 border-white/5 focus:bg-secondary/50 focus:border-primary/30 transition-all text-sm shadow-inner "
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>
 )}

 <div className="flex items-center gap-2 sm:gap-4">
 <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
 <Activity className="w-3 h-3 text-primary animate-pulse" />
 <span className="text-[9px] font-bold text-primary/80 tracking-widest">Live</span>
 </div>
 
 <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 rounded-xl h-10 w-10 group">
 <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
 <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background border-primary/20 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
 </Button>
 
 
 
 <div className="flex items-center gap-2 pl-2">

 </div>
 </div>
 </header>

 {/* Main content */}
 <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:p-6 transition-all duration-300">
 <Outlet />
 </main>
 </div>
 </div>
 );
};

export default SuperAdminLayout;