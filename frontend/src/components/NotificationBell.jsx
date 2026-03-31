import { useEffect, useMemo } from 'react';
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
import { Bell, Check, Trash2, Info, FolderKanban, ListTodo, Activity, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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
        return '/timesheets';
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_UPDATED':
      case 'TASK_APPROVED':
      case 'TASK_REJECTED':
        return '/tasks';
      case 'PROJECT_ASSIGNED':
        return '/projects';
      case 'CHAT_MESSAGE':
        return '/chat';
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
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PROJECT_ASSIGNED':
        return <div className="p-2 bg-blue-500/10 rounded-full"><FolderKanban className="w-4 h-4 text-blue-500" /></div>;
      case 'TASK_ASSIGNED':
        return <div className="p-2 bg-purple-500/10 rounded-full"><ListTodo className="w-4 h-4 text-purple-500" /></div>;
      case 'TASK_STATUS_UPDATED':
        return <div className="p-2 bg-orange-500/10 rounded-full"><Activity className="w-4 h-4 text-orange-500" /></div>;
      case 'TASK_APPROVED':
      case 'TIMESHEET_APPROVED':
        return <div className="p-2 bg-green-500/10 rounded-full"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>;
      case 'TASK_REJECTED':
      case 'TIMESHEET_REJECTED':
        return <div className="p-2 bg-red-500/10 rounded-full"><XCircle className="w-4 h-4 text-red-500" /></div>;
      case 'CHAT_MESSAGE':
        return <div className="p-2 bg-cyan-500/10 rounded-full"><MessageSquare className="w-4 h-4 text-cyan-500" /></div>;
      case 'WORKLOG_SUBMITTED':
        return <div className="p-2 bg-amber-500/10 rounded-full"><Clock className="w-4 h-4 text-amber-500" /></div>;
      default:
        return <div className="p-2 bg-gray-500/10 rounded-full"><Info className="w-4 h-4 text-gray-500" /></div>;
    }
  };

  const NotificationItem = ({ notification }) => (
    <div
      key={notification.id}
      className={cn(
        "p-4 flex gap-4 hover:bg-muted transition-all group relative border-l-2 cursor-pointer",
        !notification.isRead ? "bg-primary/[0.03] border-primary" : "border-transparent opacity-80"
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
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed Montserrat">
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-muted rounded-full transition-all group p-1.5 sm:p-2 h-9 w-9 sm:h-12 sm:w-12 overflow-visible"
        >
          <Bell className={cn(
            "w-5 h-5 sm:w-8 sm:h-8 transition-all",
            unreadCount > 0 ? "text-primary animate-ring" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 z-50">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
              <div className="relative min-w-[22px] h-[22px] px-1 bg-destructive text-[11px] font-black text-destructive-foreground rounded-full flex items-center justify-center ring-2 ring-background shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-[420px] p-0 border border-border bg-popover text-popover-foreground backdrop-blur-2xl shadow-lg rounded-3xl overflow-hidden" align="end">
        <div className="flex items-center justify-between p-6 bg-muted/30 border-b border-border">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary Montserrat mb-0.5">Alert Center</span>
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

        <ScrollArea className="h-[480px]">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Activity className="w-8 h-8 text-primary/40 animate-spin" />
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Synchronizing alerts...</p>
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

