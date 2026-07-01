import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[700px] max-h-[85vh] bg-background border-none text-foreground rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-0 overflow-hidden flex flex-col">
                
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
                                    {task.title}
                                </DialogTitle>
                                {canEdit && onEditClick && (
                                    <Button onClick={onEditClick} variant="outline" size="sm" className="shrink-0 rounded-xl bg-background hover:bg-secondary/50 transition-colors shadow-sm h-8 sm:h-9 px-2 sm:px-3">
                                        <Edit className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Edit Task</span>
                                    </Button>
                                )}
                            </div>
                        </div>

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
                                        <div className="flex -space-x-2">
                                            {task.assignees.map(({ user }) => (
                                                <Avatar key={user.id} className="h-7 w-7 border-2 border-background ring-1 ring-border/20 shadow-sm" title={user.name}>
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                        {user.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
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
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsModal;
