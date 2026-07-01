import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Trash2, Info, FolderKanban, ListTodo, Activity, MessageSquare, CheckCircle2, XCircle, Clock, Building2 } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import VibrantLoader from '@/components/ui/VibrantLoader';

const NotificationSkeleton = () => (
  <div className="p-4 flex gap-4 border-b border-border/50 animate-pulse">
    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-2 w-12 rounded-full opacity-50" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-2.5 w-[80%] rounded-full opacity-70" />
    </div>
  </div>
);

const NotificationBell = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead), 
  [notifications]);

  const readNotifications = useMemo(() => 
    notifications.filter(n => n.isRead), 
  [notifications]);

  // Derive a navigation link from the notification type or stored link
  const getNotificationLink = (notification) => {
    if (notification.link) return notification.link;
    switch (notification.type) {
      case 'WORKLOG_SUBMITTED':
      case 'TIMESHEET_APPROVED':
      case 'TIMESHEET_REJECTED':
      case 'LEAVE_SUBMITTED':
      case 'LEAVE_APPROVED':
      case 'LEAVE_REJECTED':
        return '/timesheets';
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_UPDATED':
      case 'TASK_APPROVED':
      case 'TASK_REJECTED':
        return '/tasks';
      case 'TASK_APPROVAL_REQUEST':
        return '/task-board';
      case 'PROJECT_ASSIGNED':
        return '/projects';
      case 'CHAT_MESSAGE':
        return '/chat';
      case 'NEW_ORG_SIGNUP':
        return '/superadmin/orgs';
      case 'TICKET_CREATED':
      case 'TICKET_STATUS_UPDATED':
      case 'TICKET_COMMENT':
        return notification.link || '/tickets';
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PROJECT_ASSIGNED':
        return <div className="p-1.5 bg-primary/10 rounded-full"><FolderKanban className="w-3.5 h-3.5 text-primary" /></div>;
      case 'TASK_ASSIGNED':
        return <div className="p-1.5 bg-primary/10 rounded-full"><ListTodo className="w-3.5 h-3.5 text-primary" /></div>;
      case 'TASK_STATUS_UPDATED':
      case 'TASK_APPROVAL_REQUEST':
        return <div className="p-1.5 bg-amber-500/10 rounded-full"><Activity className="w-3.5 h-3.5 text-amber-500" /></div>;
      case 'TASK_APPROVED':
      case 'TIMESHEET_APPROVED':
      case 'LEAVE_APPROVED':
        return <div className="p-1.5 bg-primary/20 rounded-full"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /></div>;
      case 'TASK_REJECTED':
      case 'TIMESHEET_REJECTED':
      case 'LEAVE_REJECTED':
        return <div className="p-1.5 bg-destructive/10 rounded-full"><XCircle className="w-3.5 h-3.5 text-destructive" /></div>;
      case 'CHAT_MESSAGE':
        return <div className="p-1.5 bg-sky-500/10 rounded-full"><MessageSquare className="w-3.5 h-3.5 text-sky-500" /></div>;
      case 'WORKLOG_SUBMITTED':
      case 'LEAVE_SUBMITTED':
        return <div className="p-1.5 bg-amber-500/10 rounded-full"><Clock className="w-3.5 h-3.5 text-amber-500" /></div>;
      case 'NEW_ORG_SIGNUP':
        return <div className="p-1.5 bg-[#48A111]/20 rounded-full shadow-[0_0_10px_rgba(72,161,17,0.2)]"><Building2 className="w-3.5 h-3.5 text-[#48A111]" /></div>;
      case 'TICKET_CREATED':
        return <div className="p-1.5 bg-blue-500/10 rounded-full"><MessageSquare className="w-3.5 h-3.5 text-blue-500" /></div>;
      case 'TICKET_STATUS_UPDATED':
        return <div className="p-1.5 bg-orange-500/10 rounded-full"><Clock className="w-3.5 h-3.5 text-orange-500" /></div>;
      case 'TICKET_COMMENT':
        return <div className="p-1.5 bg-indigo-500/10 rounded-full"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /></div>;
      default:
        return <div className="p-1.5 bg-gray-500/10 rounded-full"><Info className="w-3.5 h-3.5 text-gray-500" /></div>;
    }
  };

  const NotificationItem = ({ notification }) => (
    <div
      key={notification.id}
      className={cn(
        "p-3 flex gap-3 hover:bg-muted/50 transition-all group relative border-l-[3px] cursor-pointer",
        !notification.isRead ? "bg-primary/[0.05] dark:bg-primary/[0.1] border-primary" : "border-transparent opacity-70"
      )}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="shrink-0 mt-0.5">
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={cn(
            "text-xs font-bold leading-tight line-clamp-1",
            notification.isRead ? "text-muted-foreground" : "text-foreground"
          )}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground/60 font-medium">
            <Clock className="w-2.5 h-2.5" />
            {formatRelativeTime(notification.createdAt)}
          </div>
        </div>
        <p className={cn(
          "text-[11px] line-clamp-2 leading-relaxed Montserrat",
          notification.isRead ? "text-muted-foreground/80" : "text-foreground font-medium"
        )}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 rounded-full hover:bg-primary/10 text-primary text-[10px] font-bold Montserrat"
              onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
            >
              <Check className="w-3 h-3 mr-1.5" /> Mark read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-red-500/10 text-red-500/60 hover:text-red-500 ml-auto"
            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-muted rounded-full transition-all group p-1.5 sm:p-2 h-9 w-9 sm:h-12 sm:w-12 overflow-visible"
        >
          <Bell className={cn(
            "w-5 h-5 sm:w-8 sm:h-8 transition-all duration-500",
            unreadCount > 0 ? "text-[#48A111] drop-shadow-[0_0_12px_rgba(72,161,17,0.8)] animate-ring scale-110" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 z-50">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff0000] opacity-60"></span>
              <div className="relative min-w-[22px] h-[22px] px-1 bg-[#ff0000] text-[11px] font-black text-white rounded-full flex items-center justify-center ring-2 ring-background shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-glow border border-white/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-[350px] p-0 border border-border/50 bg-popover/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden" align="end">
        <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/40">
          <div className="flex flex-col">
             <h3 className="text-lg font-bold Montserrat tracking-tight">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] uppercase tracking-wider font-black text-primary hover:bg-primary/10 rounded-xl h-8 px-4"
              onClick={markAllAsRead}
            >
              Clear all
            </Button>
          )}
        </div>

        <ScrollArea className="h-[380px]">
          {loading ? (
            <div className="flex flex-col">
              <div className="p-8 bg-muted/10 border-b border-border/50 flex flex-col items-center justify-center gap-3">
                <VibrantLoader size="sm" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 Montserrat">Synchronizing feed...</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-muted/50 rounded-[2.5rem] flex items-center justify-center border border-border">
                <Bell className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold Montserrat">Stay tuned!</p>
                <p className="text-[11px] text-muted-foreground Montserrat">You're all caught up for now.</p>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              {unreadNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="px-6 pt-6 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 Montserrat">New</span>
                  </div>
                  <div className="divide-y divide-border">
                    {unreadNotifications.map((n) => <NotificationItem key={n.id} notification={n} />)}
                  </div>
                </div>
              )}

              {readNotifications.length > 0 && (
                <div className="space-y-1">
                  <div className="px-6 pt-8 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 Montserrat">Earlier</span>
                  </div>
                  <div className="divide-y divide-border">
                    {readNotifications.map((n) => <NotificationItem key={n.id} notification={n} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-4 bg-muted/20 border-t border-border text-center">
             <p className="text-[10px] text-muted-foreground/50 Montserrat uppercase tracking-widest font-bold">End of feed</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

