import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { 
    Calendar, User, CheckSquare, Bug, Zap, BookOpen, GitBranch, 
    File as FileIcon, Clock, Layers, LayoutList, AlertCircle, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, priorityColors, statusColors, taskTypeColors } from '@/lib/utils';
import { getFileUrl } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';

const getTaskProgress = (task) => {
    if (task.status === 'COMPLETED') return 100;
    if (task.completionPercentage > 0) return task.completionPercentage;
    if (task.status === 'IN_REVIEW') return 75;
    if (task.status === 'IN_PROGRESS') return 50;
    return 0;
};

const TaskDetailsModal = ({ open, onOpenChange, task, canEdit, onEditClick }) => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('details');
    const [comments, setComments] = useState([]);
    const [activity, setActivity] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);

    useEffect(() => {
        if (open && task?.id) {
            setActiveTab('details');
            fetchComments();
            fetchActivity();
        }
    }, [open, task?.id]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const res = await api.get(`/tasks/${task.id}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const fetchActivity = async () => {
        setLoadingActivity(true);
        try {
            const res = await api.get(`/tasks/${task.id}/activity`);
            setActivity(res.data);
        } catch (error) {
            console.error('Failed to fetch activity', error);
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/tasks/${task.id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to add comment', error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/tasks/comments/${commentId}`);
            fetchComments();
        } catch (error) {
            console.error('Failed to delete comment', error);
        }
    };

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[700px] max-h-[85vh] bg-background border-none text-foreground rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-0 flex flex-col">
                
                <ScrollArea className="flex-1 w-full max-h-[85vh] overflow-y-auto">
                    <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                        
                        {/* 1. Header Section */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-sm`}>
                                    {task.type === 'BUG' && <Bug className="w-3 h-3" />}
                                    {task.type === 'STORY' && <BookOpen className="w-3 h-3" />}
                                    {task.type === 'EPIC' && <Zap className="w-3 h-3" />}
                                    {task.type === 'SUBTASK' && <GitBranch className="w-3 h-3" />}
                                    {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-3 h-3" />}
                                    {task.type || 'TASK'}
                                </Badge>
                                <Badge className={`${priorityColors[task.priority]} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase shadow-sm`}>
                                    {task.priority || 'NORMAL'}
                                </Badge>
                                <Badge className={`${statusColors[task.status] || 'bg-muted'} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase shadow-sm`}>
                                    {task.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            
                            <div className="flex justify-between items-start gap-3 sm:gap-4">
                                <DialogTitle className="text-xl sm:text-3xl font-black Montserrat leading-tight tracking-tight text-foreground break-words overflow-hidden">
                                    {task.shortId && <span className="text-muted-foreground font-normal mr-2">[{task.shortId}]</span>}
                                    {task.title}
                                </DialogTitle>
                                {canEdit && onEditClick && (
                                    <Button onClick={onEditClick} variant="outline" size="sm" className="shrink-0 rounded-xl bg-background hover:bg-secondary/50 transition-colors shadow-sm h-8 sm:h-9 px-2 sm:px-3">
                                        <Edit className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Edit Task</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className={`grid w-full mb-6 bg-secondary/50 rounded-xl p-1 ${user?.role !== 'MEMBER' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                <TabsTrigger value="details" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Details</TabsTrigger>
                                <TabsTrigger value="comments" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Comments</TabsTrigger>
                                {user?.role !== 'MEMBER' && (
                                    <TabsTrigger value="activity" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Activity</TabsTrigger>
                                )}
                            </TabsList>

                            <TabsContent value="details" className="space-y-6 sm:space-y-8 mt-0 outline-none">

                        {task.rejectionReason && (
                            <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl shadow-sm">
                                <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" /> Rejection Reason
                                </h4>
                                <p className="text-red-500/90 text-sm font-medium whitespace-pre-wrap">
                                    {task.rejectionReason}
                                </p>
                            </div>
                        )}

                        {/* 2. Meta Info Row (Notion/Linear style) */}
                        <div className="grid grid-cols-2 md:flex md:flex-wrap items-start md:items-center gap-4 sm:gap-6 p-4 sm:p-5 bg-secondary/30 rounded-2xl border border-border/50">
                            
                            {/* Project */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Project</span>
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground overflow-hidden">
                                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                        <Layers className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="truncate">{task.project?.name || 'No Project'}</span>
                                </div>
                            </div>

                            {/* Assignees */}
                            <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Assignees</span>
                                <div className="flex items-center">
                                    {task.assignees && task.assignees.length > 0 ? (
                                        <div className="flex flex-col gap-2 mt-1">
                                            {task.assignees.map(({ user, assignedBy }) => (
                                                <div key={user.id} className="flex items-center gap-2" title={assignedBy ? `${assignedBy.name} assigned to ${user.name}` : user.name}>
                                                    <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-border/20 shadow-sm">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                            {user.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {assignedBy ? `${assignedBy.name.split(' ')[0]} To ${user.name.split(' ')[0]}` : user.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                                                <User className="w-3 h-3" />
                                            </div>
                                            Unassigned
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Due Date */}
                            {task.dueDate && (
                                <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Due Date</span>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {formatDate(task.dueDate)}
                                    </div>
                                </div>
                            )}

                            {/* Completed On */}
                            {task.completedAt && (
                                <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest Montserrat">Completed On</span>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        {formatDate(task.completedAt)}
                                    </div>
                                </div>
                            )}

                            {/* Story Points */}
                            {task.storyPoints > 0 && (
                                <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Points</span>
                                    <div className="flex items-center">
                                        <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                            {task.storyPoints}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Progress */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold Montserrat">
                                <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Current Progress</span>
                                <span className={task.status === 'COMPLETED' ? 'text-green-500' : 'text-primary'}>
                                    {getTaskProgress(task)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${getTaskProgress(task)}%`,
                                        backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                                    }}
                                />
                            </div>
                        </div>

                        {/* 4. Description */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold Montserrat text-foreground/80 flex items-center gap-2 border-b border-border/50 pb-2">
                                <LayoutList className="w-4 h-4 text-muted-foreground" />
                                Description
                            </h3>
                            {task.description ? (
                                <div 
                                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-medium"
                                    dangerouslySetInnerHTML={{ __html: task.description }}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground italic bg-secondary/20 p-4 rounded-xl border border-border/50 border-dashed text-center">
                                    No description has been provided for this task.
                                </p>
                            )}
                        </div>

                        {/* 5. Attachments */}
                        {task.attachments && task.attachments.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <h3 className="text-sm font-bold Montserrat text-foreground/80 flex items-center gap-2 border-b border-border/50 pb-2">
                                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                                    Attachments
                                    <span className="bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md text-[10px] ml-2">
                                        {task.attachments.length}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {task.attachments.map((file, idx) => (
                                        <a 
                                            key={idx} 
                                            href={getFileUrl(file.url)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-secondary/20 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 rounded-xl p-3 transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                <FileIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {file.name}
                                                </span>
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {(file.size / 1024).toFixed(0)} KB
                                                </span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Bottom Padding */}
                        <div className="h-4"></div>
                        </TabsContent>

                        <TabsContent value="comments" className="mt-0 outline-none flex flex-col h-full min-h-[300px]">
                            <div className="flex-1 space-y-4 mb-4">
                                {loadingComments ? (
                                    <p className="text-center text-muted-foreground py-8">Loading comments...</p>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                                        <p className="text-muted-foreground font-medium">No comments yet.</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">Be the first to share your thoughts!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3 bg-secondary/20 p-4 rounded-xl border border-border/50">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={comment.user?.avatar} />
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{comment.user?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="font-bold text-sm text-foreground">{comment.user?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{formatDate(comment.createdAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                                                </div>
                                                {(user?.id === comment.user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500 -mt-1 -mr-1"
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                    >
                                                        &times;
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <form onSubmit={handleAddComment} className="mt-auto flex gap-2">
                                <Input
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 rounded-xl bg-secondary/30 border-border/50 focus-visible:ring-primary/20"
                                />
                                <Button type="submit" disabled={!newComment.trim()} className="rounded-xl font-bold px-6">Post</Button>
                            </form>
                        </TabsContent>

                        {user?.role !== 'MEMBER' && (
                        <TabsContent value="activity" className="mt-0 outline-none">
                            {loadingActivity ? (
                                <p className="text-center text-muted-foreground py-8">Loading activity...</p>
                            ) : activity.length === 0 ? (
                                <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                                    <p className="text-muted-foreground font-medium">No activity recorded yet.</p>
                                </div>
                            ) : (
                                <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                    {activity.map((log, i) => (
                                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-background bg-secondary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={log.user?.avatar} />
                                                    <AvatarFallback className="text-[8px]">{log.user?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] bg-secondary/20 p-3 rounded-xl border border-border/50 shadow-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-xs text-foreground">{log.user?.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{formatDate(log.createdAt)}</span>
                                                </div>
                                                <p className="text-xs text-foreground/80">
                                                    <span className="font-semibold text-primary">{log.action}</span>
                                                    {log.details && (
                                                        <div className="mt-1.5 space-y-1">
                                                            {(() => {
                                                                if (typeof log.details === 'string') return <span className="text-muted-foreground">- {log.details}</span>;
                                                                
                                                                if (log.action === 'UPDATED') {
                                                                    if (log.details.changes) {
                                                                        const changes = Object.keys(log.details.changes)
                                                                            .filter(key => !['id', 'projectId', 'phaseId', 'tags', 'type', 'title', 'assignees', 'createdAt', 'updatedAt'].includes(key))
                                                                            .map(key => {
                                                                                const val = log.details.changes[key];
                                                                                if (key === 'status') return `Status changed to ${val}`;
                                                                                if (key === 'priority') return `Priority changed to ${val}`;
                                                                                if (key === 'dueDate') return `Due date updated`;
                                                                                if (key === 'description') return `Description updated`;
                                                                                if (key === 'completionPercentage') return `Progress changed to ${val}%`;
                                                                                return `${key} updated`;
                                                                            });
                                                                            
                                                                        if (changes.length > 0) {
                                                                            return changes.map((change, idx) => (
                                                                                <p key={idx} className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">{change}</p>
                                                                            ));
                                                                        }
                                                                    } else if (log.details.action === 'Status Updated') {
                                                                        return <p className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">Status changed to {log.details.status}</p>;
                                                                    } else if (log.details.action === 'Progress Updated') {
                                                                        return <p className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">Progress changed to {log.details.completionPercentage}%</p>;
                                                                    }
                                                                }
                                                                
                                                                // Default fallback for other object details
                                                                if (log.details.title && !log.details.changes && !log.details.action && Object.keys(log.details).length === 1) {
                                                                     return null; // Just the title, no extra info needed
                                                                }
                                                                
                                                                return null;
                                                            })()}
                                                        </div>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                        )}
                        </Tabs>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsModal;
