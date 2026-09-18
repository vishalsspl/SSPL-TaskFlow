import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { 
    Calendar, User, CheckSquare, Bug, Zap, BookOpen, GitBranch, 
    File as FileIcon, Clock, Layers, LayoutList, AlertCircle, Edit,
    ChevronRight, CornerDownRight, CheckCircle2, CircleDot,
    FolderTree, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, priorityColors, statusColors, taskTypeColors } from '@/lib/utils';
import { getFileUrl } from '@/lib/api';

const getTaskProgress = (task) => {
    if (!task) return 0;
    if (task.status === 'COMPLETED') return 100;
    if (task.completionPercentage > 0) return task.completionPercentage;
    if (task.status === 'IN_REVIEW') return 75;
    if (task.status === 'IN_PROGRESS') return 50;
    return 0;
};

const cleanHtmlDescription = (html) => {
    if (!html || typeof html !== 'string') return '';
    return html
        .replace(/^(<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>|<br\s*\/?>)+/gi, '')
        .replace(/(<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>|<br\s*\/?>)+$/gi, '')
        .trim();
};

const getAttachmentsList = (attachments) => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === 'string') {
        try {
            const parsed = JSON.parse(attachments);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

const TaskDetailsModal = ({ open, onOpenChange, task: initialTask, canEdit, onEditClick }) => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('details');
    const [currentTask, setCurrentTask] = useState(initialTask);
    const [taskHistory, setTaskHistory] = useState([]);
    const [comments, setComments] = useState([]);
    const [activity, setActivity] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [loadingTaskDetails, setLoadingTaskDetails] = useState(false);

    useEffect(() => {
        if (open && initialTask?.id) {
            setCurrentTask(initialTask);
            setTaskHistory([]);
            setActiveTab('details');
            fetchFullTask(initialTask.id);
            fetchComments(initialTask.id);
            fetchActivity(initialTask.id);
        }
    }, [open, initialTask?.id]);

    const fetchFullTask = async (taskId) => {
        if (!taskId) return;
        setLoadingTaskDetails(true);
        try {
            const res = await api.get(`/tasks/${taskId}`);
            const data = res.data?.data || res.data;
            if (data && data.id) {
                setCurrentTask(data);
            }
        } catch (error) {
            console.error('Failed to fetch full task details', error);
        } finally {
            setLoadingTaskDetails(false);
        }
    };

    const fetchComments = async (taskId) => {
        const id = taskId || currentTask?.id;
        if (!id) return;
        setLoadingComments(true);
        try {
            const res = await api.get(`/tasks/${id}/comments`);
            setComments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const fetchActivity = async (taskId) => {
        const id = taskId || currentTask?.id;
        if (!id) return;
        setLoadingActivity(true);
        try {
            const res = await api.get(`/tasks/${id}/activity`);
            setActivity(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch activity', error);
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleNavigateToTask = (targetTask) => {
        if (!targetTask || !targetTask.id || targetTask.id === currentTask?.id) return;
        setTaskHistory(prev => [...prev, currentTask]);
        
        // Preserve safe fallback properties during transition
        setCurrentTask(prev => ({
            ...targetTask,
            assignees: targetTask.assignees || [],
            children: targetTask.children || [],
            attachments: targetTask.attachments || [],
            status: targetTask.status || 'TODO',
            type: targetTask.type || 'TASK',
            priority: targetTask.priority || 'MEDIUM',
            project: targetTask.project || prev?.project,
        }));

        fetchFullTask(targetTask.id);
        fetchComments(targetTask.id);
        fetchActivity(targetTask.id);
    };

    const handleNavigateBack = () => {
        if (taskHistory.length === 0) return;
        const prevTask = taskHistory[taskHistory.length - 1];
        setTaskHistory(prev => prev.slice(0, -1));
        if (prevTask && prevTask.id) {
            setCurrentTask(prevTask);
            fetchFullTask(prevTask.id);
            fetchComments(prevTask.id);
            fetchActivity(prevTask.id);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentTask?.id) return;
        try {
            await api.post(`/tasks/${currentTask.id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments(currentTask.id);
        } catch (error) {
            console.error('Failed to add comment', error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/tasks/comments/${commentId}`);
            fetchComments(currentTask?.id);
        } catch (error) {
            console.error('Failed to delete comment', error);
        }
    };

    if (!currentTask) return null;

    const cleanedDescription = cleanHtmlDescription(currentTask?.description);
    const attachmentsList = getAttachmentsList(currentTask?.attachments);
    const hasParent = !!currentTask?.parent;
    const hasChildren = Array.isArray(currentTask?.children) && currentTask.children.length > 0;
    const hierarchyCount = (hasParent ? 1 : 0) + (hasChildren ? currentTask.children.length : 0);

    const completedChildrenCount = hasChildren 
        ? currentTask.children.filter(c => c?.status === 'COMPLETED').length 
        : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[760px] max-h-[85vh] bg-background border-none text-foreground rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-0 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
                    
                    {/* 1. Header Section - Fixed / Non-scrolling with close button padding */}
                    <div className="p-6 sm:p-8 pb-4 sm:pb-5 border-b border-border/40 shrink-0 space-y-4 pr-14">
                        
                        {/* Task Navigation Trail if navigated inside hierarchy */}
                        {taskHistory.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <button
                                    onClick={handleNavigateBack}
                                    className="flex items-center gap-1 font-bold text-primary hover:underline"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to previous task
                                </button>
                                <span>&bull;</span>
                                <span className="truncate max-w-[200px]">
                                    {taskHistory[taskHistory.length - 1]?.title || 'Task'}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${taskTypeColors[currentTask?.type || 'TASK']} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-sm`}>
                                {currentTask?.type === 'BUG' && <Bug className="w-3 h-3" />}
                                {currentTask?.type === 'STORY' && <BookOpen className="w-3 h-3" />}
                                {currentTask?.type === 'EPIC' && <Zap className="w-3 h-3" />}
                                {currentTask?.type === 'SUBTASK' && <GitBranch className="w-3 h-3" />}
                                {(currentTask?.type === 'TASK' || !currentTask?.type) && <CheckSquare className="w-3 h-3" />}
                                {currentTask?.type || 'TASK'}
                            </Badge>
                            <Badge className={`${priorityColors[currentTask?.priority] || 'bg-muted'} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase shadow-sm`}>
                                {currentTask?.priority || 'NORMAL'}
                            </Badge>
                            <Badge className={`${statusColors[currentTask?.status] || 'bg-muted'} border-0 px-2.5 py-1 text-[9px] font-black tracking-widest uppercase shadow-sm`}>
                                {(currentTask?.status || 'TODO').replace('_', ' ')}
                            </Badge>
                        </div>
                        
                        <div className="flex justify-between items-start gap-3 sm:gap-4">
                            <DialogTitle className="text-xl sm:text-2xl font-black Montserrat leading-tight tracking-tight text-foreground break-words overflow-hidden">
                                {currentTask?.shortId && <span className="text-muted-foreground font-normal mr-2">[{currentTask.shortId}]</span>}
                                {currentTask?.title || 'Untitled Task'}
                            </DialogTitle>
                            {canEdit && onEditClick && (
                                <Button onClick={onEditClick} variant="outline" size="sm" className="shrink-0 rounded-xl bg-background hover:bg-secondary/50 transition-colors shadow-sm h-8 sm:h-9 px-2 sm:px-3">
                                    <Edit className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Edit Task</span>
                                </Button>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <TabsList className={`grid w-full bg-secondary/50 rounded-xl p-1 ${user?.role !== 'MEMBER' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                            <TabsTrigger value="details" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                Details
                            </TabsTrigger>

                            <TabsTrigger value="hierarchy" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
                                <FolderTree className="w-3.5 h-3.5" />
                                <span>Hierarchy</span>
                                {hierarchyCount > 0 && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black ml-0.5">
                                        {hierarchyCount}
                                    </span>
                                )}
                            </TabsTrigger>

                            <TabsTrigger value="comments" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                Comments {comments.length > 0 && `(${comments.length})`}
                            </TabsTrigger>

                            {user?.role !== 'MEMBER' && (
                                <TabsTrigger value="activity" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                    Activity
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* 2. Scrollable Content Area */}
                    <div className="flex-1 w-full overflow-y-auto p-6 sm:p-8 pt-4 sm:pt-6 no-scrollbar min-h-0">
                        
                        {/* ─── DETAILS TAB ────────────────────────────────────────── */}
                        <TabsContent value="details" className="space-y-6 mt-0 outline-none data-[state=inactive]:hidden">
                            {currentTask?.rejectionReason && (
                                <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl shadow-sm">
                                    <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" /> Rejection Reason
                                    </h4>
                                    <p className="text-red-500/90 text-sm font-medium whitespace-pre-wrap">
                                        {currentTask.rejectionReason}
                                    </p>
                                </div>
                            )}

                            {/* Meta Info Row */}
                            <div className="grid grid-cols-2 md:flex md:flex-wrap items-start md:items-center gap-4 sm:gap-6 p-4 sm:p-5 bg-secondary/30 rounded-2xl border border-border/50">
                                {/* Project */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Project</span>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground overflow-hidden">
                                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                            <Layers className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="truncate">{currentTask?.project?.name || 'No Project'}</span>
                                    </div>
                                </div>

                                {/* Assignees */}
                                <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Assignees</span>
                                    <div className="flex items-center">
                                        {Array.isArray(currentTask?.assignees) && currentTask.assignees.length > 0 ? (
                                            <div className="flex flex-col gap-2 mt-1">
                                                {currentTask.assignees.map((assignee, idx) => {
                                                    const u = assignee?.user || assignee;
                                                    const by = assignee?.assignedBy;
                                                    const userName = u?.name || 'User';
                                                    return (
                                                        <div key={u?.id || idx} className="flex items-center gap-2" title={by ? `${by.name} assigned to ${userName}` : userName}>
                                                            <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-border/20 shadow-sm">
                                                                <AvatarImage src={u?.avatar} />
                                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                                    {userName.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs font-semibold text-foreground">
                                                                {by ? `${by.name?.split(' ')[0]} To ${userName.split(' ')[0]}` : userName}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
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
                                {currentTask?.dueDate && (
                                    <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Due Date</span>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            {formatDate(currentTask.dueDate)}
                                        </div>
                                    </div>
                                )}

                                {/* Completed On */}
                                {currentTask?.completedAt && (
                                    <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest Montserrat">Completed On</span>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            {formatDate(currentTask.completedAt)}
                                        </div>
                                    </div>
                                )}

                                {/* Story Points */}
                                {currentTask?.storyPoints > 0 && (
                                    <div className="flex flex-col gap-1.5 md:border-l md:border-border/50 md:pl-6">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest Montserrat">Points</span>
                                        <div className="flex items-center">
                                            <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                {currentTask.storyPoints}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Task Hierarchy Quick Card in Details Tab */}
                            {(hasParent || hasChildren) && (
                                <div className="p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl transition-all space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground Montserrat uppercase tracking-wider">
                                            <FolderTree className="w-4 h-4 text-primary" />
                                            <span>Task Hierarchy</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setActiveTab('hierarchy')}
                                            className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/15 h-7 px-2.5 rounded-lg"
                                        >
                                            View Full Tree &rarr;
                                        </Button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-primary/10 text-xs">
                                        {hasParent && (
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="text-muted-foreground font-semibold">Parent:</span>
                                                <button
                                                    onClick={() => handleNavigateToTask(currentTask.parent)}
                                                    className="font-bold text-foreground hover:text-primary underline-offset-2 hover:underline truncate max-w-[200px]"
                                                >
                                                    {currentTask.parent.shortId ? `[${currentTask.parent.shortId}] ` : ''}
                                                    {currentTask.parent.title}
                                                </button>
                                            </div>
                                        )}

                                        {hasChildren && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-muted-foreground font-semibold">Subtasks:</span>
                                                <span className="font-bold text-foreground">
                                                    {completedChildrenCount}/{currentTask.children.length} Completed
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Progress */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold Montserrat">
                                    <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Current Progress</span>
                                    <span className={currentTask?.status === 'COMPLETED' ? 'text-green-500' : 'text-primary'}>
                                        {getTaskProgress(currentTask)}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${getTaskProgress(currentTask)}%`,
                                            backgroundColor: currentTask?.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold Montserrat text-foreground/80 flex items-center gap-2 border-b border-border/50 pb-2">
                                    <LayoutList className="w-4 h-4 text-muted-foreground" />
                                    Description
                                </h3>
                                {cleanedDescription ? (
                                    <div 
                                        className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-medium [&>*:last-child]:mb-0 [&>p:empty]:hidden"
                                        dangerouslySetInnerHTML={{ __html: cleanedDescription }}
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground italic bg-secondary/20 p-4 rounded-xl border border-border/50 border-dashed text-center">
                                        No description has been provided for this task.
                                    </p>
                                )}
                            </div>

                            {/* Attachments */}
                            {attachmentsList.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-sm font-bold Montserrat text-foreground/80 flex items-center gap-2 border-b border-border/50 pb-2">
                                        <FileIcon className="w-4 h-4 text-muted-foreground" />
                                        Attachments
                                        <span className="bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-md text-[10px] ml-2">
                                            {attachmentsList.length}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {attachmentsList.map((file, idx) => (
                                            <a 
                                                key={idx} 
                                                href={getFileUrl(file?.url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 bg-secondary/20 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 rounded-xl p-3 transition-all group shadow-sm hover:shadow-md"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                    <FileIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {file?.name || 'File'}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                        {file?.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* ─── TASK HIERARCHY TAB ──────────────────────────────────── */}
                        <TabsContent value="hierarchy" className="space-y-6 mt-0 outline-none data-[state=inactive]:hidden">
                            <div className="space-y-6">
                                
                                {/* Breadcrumb Pathway */}
                                <div className="flex items-center flex-wrap gap-1.5 text-xs font-semibold text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border/50">
                                    <span className="flex items-center gap-1 text-primary">
                                        <Layers className="w-3.5 h-3.5" />
                                        {currentTask?.project?.name || 'Project'}
                                    </span>
                                    
                                    {currentTask?.parent?.parent && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                                            <button
                                                onClick={() => handleNavigateToTask(currentTask.parent.parent)}
                                                className="hover:text-primary transition-colors truncate max-w-[130px]"
                                            >
                                                {currentTask.parent.parent.shortId ? `[${currentTask.parent.parent.shortId}] ` : ''}
                                                {currentTask.parent.parent.title}
                                            </button>
                                        </>
                                    )}

                                    {currentTask?.parent && (
                                        <>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                                            <button 
                                                onClick={() => handleNavigateToTask(currentTask.parent)}
                                                className="hover:text-primary transition-colors truncate max-w-[150px]"
                                            >
                                                {currentTask.parent.shortId ? `[${currentTask.parent.shortId}] ` : ''}
                                                {currentTask.parent.title}
                                            </button>
                                        </>
                                    )}

                                    <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                                    <span className="text-foreground font-black bg-background px-2 py-0.5 rounded-md border border-border/60 shadow-xs truncate max-w-[200px]">
                                        {currentTask?.shortId ? `[${currentTask.shortId}] ` : ''}
                                        {currentTask?.title}
                                    </span>
                                </div>

                                {/* Hierarchy Tree View */}
                                <div className="space-y-4">

                                    {/* 1. Grandparent / Parent Node */}
                                    {currentTask?.parent && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                                                    Parent Task
                                                </span>
                                            </div>

                                            <div 
                                                onClick={() => handleNavigateToTask(currentTask.parent)}
                                                className="p-4 bg-secondary/30 hover:bg-secondary/60 border border-border/60 hover:border-primary/40 rounded-2xl transition-all cursor-pointer group shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Badge className={`${taskTypeColors[currentTask.parent.type || 'TASK']} border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase shrink-0 mt-0.5`}>
                                                        {currentTask.parent.type || 'TASK'}
                                                    </Badge>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                            {currentTask.parent.shortId && <span className="text-muted-foreground mr-1.5">[{currentTask.parent.shortId}]</span>}
                                                            {currentTask.parent.title}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Click to view this parent task details
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                    {currentTask.parent.status && (
                                                        <Badge className={`${statusColors[currentTask.parent.status] || 'bg-muted'} border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase`}>
                                                            {(currentTask.parent.status || 'TODO').replace('_', ' ')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Branch Line Connector to Current Node */}
                                            <div className="pl-6 flex items-center h-6">
                                                <div className="w-0.5 h-full bg-primary/40 ml-2" />
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Current Task Node (Highlighted) */}
                                    <div className="relative p-5 bg-primary/10 border-2 border-primary rounded-2xl shadow-md space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-primary text-primary-foreground border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">
                                                    CURRENT TASK
                                                </Badge>
                                                <Badge className={`${taskTypeColors[currentTask?.type || 'TASK']} border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase`}>
                                                    {currentTask?.type || 'TASK'}
                                                </Badge>
                                            </div>
                                            <Badge className={`${statusColors[currentTask?.status] || 'bg-muted'} border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase`}>
                                                {(currentTask?.status || 'TODO').replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <div>
                                            <h4 className="text-base font-black Montserrat text-foreground">
                                                {currentTask?.shortId && <span className="text-muted-foreground mr-1.5">[{currentTask.shortId}]</span>}
                                                {currentTask?.title}
                                            </h4>
                                        </div>

                                        <div className="pt-2 border-t border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-4">
                                                <span className="text-muted-foreground font-semibold">
                                                    Priority: <strong className="text-foreground">{currentTask?.priority || 'NORMAL'}</strong>
                                                </span>
                                                <span className="text-muted-foreground font-semibold">
                                                    Progress: <strong className="text-foreground">{getTaskProgress(currentTask)}%</strong>
                                                </span>
                                            </div>

                                            {Array.isArray(currentTask?.assignees) && currentTask.assignees.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] text-muted-foreground font-semibold">Assignee:</span>
                                                    <span className="font-bold text-foreground">
                                                        {currentTask.assignees[0]?.user?.name || currentTask.assignees[0]?.name || 'Assigned'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Subtasks / Children Nodes */}
                                    {hasChildren ? (
                                        <div className="space-y-3 pt-2">
                                            {/* Connector line down to children */}
                                            <div className="pl-6 flex items-center h-4">
                                                <div className="w-0.5 h-full bg-primary/40 ml-2" />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                                    <CornerDownRight className="w-3.5 h-3.5 text-primary" />
                                                    Subtasks & Children ({currentTask.children.length})
                                                </span>
                                                <span className="text-[11px] font-bold text-muted-foreground">
                                                    {completedChildrenCount} of {currentTask.children.length} completed
                                                </span>
                                            </div>

                                            <div className="space-y-2.5 pl-3 sm:pl-5 border-l-2 border-primary/20 ml-3">
                                                {currentTask.children.map((child, idx) => (
                                                    <div 
                                                        key={child?.id || idx}
                                                        onClick={() => handleNavigateToTask(child)}
                                                        className="p-3.5 bg-secondary/20 hover:bg-secondary/50 border border-border/60 hover:border-primary/40 rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="shrink-0">
                                                                {child?.status === 'COMPLETED' ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                ) : (
                                                                    <CircleDot className="w-4 h-4 text-primary" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <Badge className={`${taskTypeColors[child?.type || 'SUBTASK']} border-0 px-1.5 py-0 text-[7px] font-black uppercase shrink-0`}>
                                                                        {child?.type || 'SUBTASK'}
                                                                    </Badge>
                                                                    <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                                                        {child?.shortId && <span className="text-muted-foreground mr-1">[{child.shortId}]</span>}
                                                                        {child?.title || 'Untitled Subtask'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Badge className={`${statusColors[child?.status] || 'bg-muted'} border-0 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase`}>
                                                                {(child?.status || 'TODO').replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : !hasParent && (
                                        /* 4. Standalone Task Empty State */
                                        <div className="py-8 px-6 text-center bg-secondary/20 rounded-2xl border border-dashed border-border/60 space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                                <FolderTree className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-sm text-foreground Montserrat">Standalone Task</h4>
                                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                    This task is currently a standalone item with no parent task or subtasks linked to it.
                                                </p>
                                            </div>
                                            {canEdit && onEditClick && (
                                                <Button 
                                                    onClick={onEditClick}
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="rounded-xl text-xs font-bold gap-1.5 mt-2"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Link to Parent Task
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </TabsContent>

                        {/* ─── COMMENTS TAB ───────────────────────────────────────── */}
                        <TabsContent value="comments" className="mt-0 outline-none flex flex-col flex-1 space-y-4 data-[state=inactive]:hidden">
                            <div className="space-y-4 flex-1">
                                {loadingComments ? (
                                    <p className="text-center text-muted-foreground py-8">Loading comments...</p>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                                        <p className="text-muted-foreground font-medium">No comments yet.</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">Be the first to share your thoughts!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {comments.map((comment, idx) => (
                                            <div key={comment?.id || idx} className="flex gap-3 bg-secondary/20 p-4 rounded-xl border border-border/50">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={comment?.user?.avatar} />
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {comment?.user?.name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="font-bold text-sm text-foreground">{comment?.user?.name || 'User'}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{formatDate(comment?.createdAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment?.content}</p>
                                                </div>
                                                {(user?.id === comment?.user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
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
                            <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-border/40 flex gap-2 shrink-0">
                                <Input
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 rounded-xl bg-secondary/30 border-border/50 focus-visible:ring-primary/20"
                                />
                                <Button type="submit" disabled={!newComment.trim()} className="rounded-xl font-bold px-6">Post</Button>
                            </form>
                        </TabsContent>

                        {/* ─── ACTIVITY TAB ───────────────────────────────────────── */}
                        {user?.role !== 'MEMBER' && (
                            <TabsContent value="activity" className="mt-0 outline-none data-[state=inactive]:hidden">
                                {loadingActivity ? (
                                    <p className="text-center text-muted-foreground py-8">Loading activity...</p>
                                ) : activity.length === 0 ? (
                                    <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                                        <p className="text-muted-foreground font-medium">No activity recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                        {activity.map((log, idx) => (
                                            <div key={log?.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-background bg-secondary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={log?.user?.avatar} />
                                                        <AvatarFallback className="text-[8px]">{log?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] bg-secondary/20 p-3 rounded-xl border border-border/50 shadow-sm">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs text-foreground">{log?.user?.name || 'User'}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{formatDate(log?.createdAt)}</span>
                                                    </div>
                                                    <div className="text-xs text-foreground/80">
                                                        <span className="font-semibold text-primary">{log?.action}</span>
                                                        {log?.details && (
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
                                                                                return changes.map((change, cIdx) => (
                                                                                    <p key={cIdx} className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">{change}</p>
                                                                                ));
                                                                            }
                                                                        } else if (log.details.action === 'Status Updated') {
                                                                            return <p className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">Status changed to {log.details.status}</p>;
                                                                        } else if (log.details.action === 'Progress Updated') {
                                                                            return <p className="text-xs text-muted-foreground pl-2 border-l-2 border-border/50">Progress changed to {log.details.completionPercentage}%</p>;
                                                                        }
                                                                    }
                                                                    
                                                                    if (log.details.title && !log.details.changes && !log.details.action && Object.keys(log.details).length === 1) {
                                                                        return null;
                                                                    }
                                                                    
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsModal;
