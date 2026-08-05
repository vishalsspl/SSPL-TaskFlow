import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MoreVertical, Pencil, Trash2, ArrowRightLeft, Bug, Zap, BookOpen, GitBranch, CheckSquare, Clock, CheckCircle2, XCircle, Square } from 'lucide-react';
import { priorityColors, taskTypeColors } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

const STATUS_OPTIONS = [
    { value: 'TODO', label: 'To Do', color: '#F59E0B' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#00A3FF' },
    { value: 'IN_REVIEW', label: 'In Review', color: '#D946EF' },
    { value: 'BLOCKED', label: 'Blocked', color: '#F43F5E' },
    { value: 'COMPLETED', label: 'Completed', color: '#48A111' },
];

const KanbanCard = ({ task, isReadOnly, disableDrag, onEdit, onCardClick, onDelete, onStatusChange, isHighlighted, highlightAction, onApprove, onReject, isSelected, onToggleSelect, currentUser }) => {
    const { user } = useAuthStore();
    const canEditTask = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.permissions?.['tasks.editAny'] || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
    const pendingTag = task.tags?.find(t => t.startsWith('PENDING_APPROVAL:'));
    const isPendingApproval = !!pendingTag;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
        disabled: disableDrag ?? isReadOnly,


    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 h-[150px] bg-muted rounded-lg border border-dashed border-border"
            />
        );
    }

    let highlightClasses = 'border-border/80';
    if (isHighlighted) {
        if (highlightAction === 'approved') {
            highlightClasses = 'border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse';
        } else if (highlightAction === 'rejected') {
            highlightClasses = 'border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse';
        } else if (highlightAction === 'pending') {
            highlightClasses = 'border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse';
        } else if (highlightAction === 'new') {
            highlightClasses = 'border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse';
        } else {
            highlightClasses = 'border-2 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] animate-pulse';
        }
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 group w-full max-w-[550px] sm:max-w-none mx-auto px-2 sm:px-0">
            <Card
                className={`bg-card/60 backdrop-blur-sm border ${disableDrag ? '' : 'cursor-grab active:cursor-grabbing'} hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl ${highlightClasses}`}
                onClick={() => onCardClick && onCardClick(task)}
            >
                <div className="p-3 sm:p-2.5 space-y-2 sm:space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap flex-1">
                            <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-1.5 py-0 text-[7px] sm:text-[8px] font-black tracking-widest uppercase rounded-sm flex items-center gap-0.5 sm:gap-1 shrink-0`}>
                                {task.type === 'BUG' && <Bug className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'STORY' && <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'EPIC' && <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'SUBTASK' && <GitBranch className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type || 'TASK'}
                            </Badge>
                            <Badge className={`${priorityColors[task.priority] || 'bg-muted text-muted-foreground'} border-0 px-1.5 py-0 text-[7px] sm:text-[8px] font-black tracking-widest uppercase rounded-sm shrink-0`}>
                                {task.priority || 'NORMAL'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {task.storyPoints > 0 && (
                                <span className="text-[7px] sm:text-[8px] font-black Montserrat text-primary/80 px-1 sm:px-1.5 py-0 sm:py-0.5 bg-primary/10 rounded tracking-tighter">
                                    {task.storyPoints} PTS
                                </span>
                            )}
                            {task.status === 'IN_REVIEW' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && onToggleSelect && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                                >
                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                </button>
                            )}
                            {!isReadOnly && !(user?.role === 'MEMBER' && task.status === 'COMPLETED') && ((onEdit && canEditTask) || onDelete || onStatusChange) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent 
                                        align="end" 
                                        className="w-40 sm:w-48 bg-card border-border text-foreground"
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        {(onEdit && canEditTask) && (
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                                                className="cursor-pointer text-xs sm:text-sm py-2 sm:py-1.5"
                                            >
                                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                                Edit Task
                                            </DropdownMenuItem>
                                        )}
                                        {onStatusChange && !(user?.role === 'MEMBER' && task.status === 'COMPLETED') && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger 
                                                    className="cursor-pointer text-xs sm:text-sm py-2 sm:py-1.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                >
                                                    <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                                    Change Status
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent className="w-36 sm:w-40 bg-card border-border text-foreground">
                                                        {STATUS_OPTIONS.filter(s => s.value !== task.status && !(user?.role === 'MEMBER' && s.value === 'COMPLETED')).map((status) => (
                                                            <DropdownMenuItem
                                                                key={status.value}
                                                                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, status.value); }}
                                                                className="cursor-pointer text-xs sm:text-sm py-2 sm:py-1.5"
                                                            >
                                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: status.color }} />
                                                                {status.label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                        )}

                                        {onDelete && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                                    className="text-destructive focus:text-destructive cursor-pointer text-xs sm:text-sm py-2 sm:py-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                                    Delete Task
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                        <h4
                            className="text-[10px] sm:text-[11px] font-bold text-foreground Montserrat leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                            title={task.title}
                        >
                            {task.shortId && <span className="text-muted-foreground mr-1">[{task.shortId}]</span>}
                            {task.title}
                        </h4>
                        {task.description && (
                            <p 
                                className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1" 
                            >
                                {task.description.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}
                            </p>
                        )}
                    </div>

                    {isPendingApproval && (
                        <div className="flex items-center justify-between mt-2 mb-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[7px] sm:text-[8px] font-bold py-0 uppercase tracking-wider">
                                    Pending Approval
                                </Badge>
                            </div>
                            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onApprove && onApprove(task.id); }}
                                        className="p-1 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                                        title="Approve Status Change"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReject && onReject(task.id); }}
                                        className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                        title="Reject Status Change"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {task.project && (
                        <p className="text-[8px] sm:text-[9px] font-black Montserrat text-muted-foreground uppercase tracking-widest truncate">
                            {task.project.name}
                        </p>
                    )}

                    <div className="pt-1 sm:pt-2 flex items-center justify-between border-t border-border">
                        <div className="flex items-center gap-1 sm:gap-2 overflow-hidden max-w-[70%]">
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden">
                                    {task.assignees.slice(0, 2).map(({ user }) => (
                                        <div key={user.id} className="flex items-center gap-1.5 bg-muted/50 rounded-full pr-2 sm:pr-2.5 border border-border/50 shrink-0">
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden bg-background flex-shrink-0">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[7px] sm:text-[8px] font-black text-muted-foreground Montserrat uppercase">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[8px] sm:text-[9px] font-bold Montserrat text-foreground truncate max-w-[45px] sm:max-w-[60px]">
                                                {user.name.split(' ')[0]}
                                            </span>
                                        </div>
                                    ))}
                                    {task.assignees.length > 2 && (
                                        <div className="text-[8px] sm:text-[9px] font-black text-muted-foreground Montserrat bg-muted/50 rounded-full px-2 py-0.5 shrink-0">
                                            +{task.assignees.length - 2}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 bg-muted/50 rounded-full pr-2 sm:pr-2.5 border border-border/50 shrink-0">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-background flex items-center justify-center shrink-0">
                                        <User className="w-2.5 h-2.5 text-muted-foreground" />
                                    </div>
                                    <span className="text-[8px] sm:text-[9px] font-bold Montserrat text-muted-foreground">
                                        Unassigned
                                    </span>
                                </div>
                            )}
                        </div>

                        {task.dueDate && (
                            <div className={`flex items-center gap-0.5 sm:gap-1.5 text-[7px] sm:text-[8px] font-black Montserrat tracking-tighter ${new Date(task.dueDate) < new Date() ? 'text-destructive' : 'text-muted-foreground'}`}>
                                <Calendar className="w-2 h-2 sm:w-3 sm:h-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default KanbanCard;