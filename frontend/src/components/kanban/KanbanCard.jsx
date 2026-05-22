import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MoreVertical, Pencil, Trash2, ArrowRightLeft, Bug, Zap, BookOpen, GitBranch, CheckSquare, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { priorityColors, taskTypeColors } from '@/lib/utils';
import { useTimerStore } from '@/store/timerStore';
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
} from '@/components/ui/dropdown-menu';

const STATUS_OPTIONS = [
    { value: 'TODO', label: 'To Do', color: '#F59E0B' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#00A3FF' },
    { value: 'IN_REVIEW', label: 'In Review', color: '#D946EF' },
    { value: 'COMPLETED', label: 'Completed', color: '#48A111' },
];

const KanbanCard = ({ task, isReadOnly, onEdit, onDelete, onStatusChange, isHighlighted, onApprove, onReject }) => {
    const { user } = useAuthStore();
    const canTrackTime = user?.role !== 'CLIENT';
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
        disabled: isReadOnly,
    });

    const startTimer = useTimerStore(state => state.startTimer);

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

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none group w-full max-w-[550px] sm:max-w-none mx-auto overflow-hidden px-2 sm:px-0">
            <Card
                className={`bg-card/60 backdrop-blur-sm border-border ring-1 cursor-grab active:cursor-grabbing hover:ring-primary/40 hover:bg-accent/50 transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl ${isHighlighted ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] animate-pulse' : 'ring-border/80'}`}
            >
                <div className="p-3 sm:p-2.5 space-y-2 sm:space-y-1.5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-1.5 py-0 text-[8px] sm:text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center gap-0.5 sm:gap-1`}>
                                {task.type === 'BUG' && <Bug className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'STORY' && <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'EPIC' && <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type === 'SUBTASK' && <GitBranch className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5" />}
                                {task.type || 'TASK'}
                            </Badge>
                            <Badge className={`${priorityColors[task.priority] || 'bg-muted text-muted-foreground'} border-0 px-1.5 py-0 text-[8px] sm:text-[9px] font-black tracking-widest uppercase rounded-sm`}>
                                {task.priority || 'NORMAL'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                            {task.storyPoints > 0 && (
                                <span className="text-[8px] sm:text-[10px] font-black Montserrat text-primary/80 px-1 sm:px-1.5 py-0 sm:py-0.5 bg-primary/10 rounded tracking-tighter">
                                    {task.storyPoints} PTS
                                </span>
                            )}
                            {!isReadOnly && (onEdit || onDelete || onStatusChange || canTrackTime) && (
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
                                    <DropdownMenuContent align="end" className="w-48 bg-card border-border text-foreground">
                                        {onEdit && (
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                                                className="cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Edit Task
                                            </DropdownMenuItem>
                                        )}
                                        {onStatusChange && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="cursor-pointer">
                                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                    Change Status
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="bg-card border-border text-foreground">
                                                    {STATUS_OPTIONS.filter(s => s.value !== task.status).map((status) => (
                                                        <DropdownMenuItem
                                                            key={status.value}
                                                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, status.value); }}
                                                            className="cursor-pointer"
                                                        >
                                                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: status.color }} />
                                                            {status.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        )}
                                        {canTrackTime && (
                                            <>
                                                <DropdownMenuSeparator className="bg-border" />
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); startTimer(task.id, task.projectId || task.project?.id, task.title); }}
                                                    className="text-primary focus:text-primary cursor-pointer"
                                                >
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Start Timer
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {onDelete && (
                                            <>
                                                {!canTrackTime && <DropdownMenuSeparator className="bg-border" />}
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Task
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    <h4
                        className="text-[10px] sm:text-[11px] md:text-sm font-bold text-foreground Montserrat leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                        onClick={() => onEdit && onEdit(task)}
                    >
                        {task.title}
                    </h4>

                    {isPendingApproval && (
                        <div className="flex items-center justify-between mt-2 mb-1">
                            <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[9px] font-bold py-0 uppercase tracking-wider">
                                Pending Approval
                            </Badge>
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
                        <p className="text-[10px] font-black Montserrat text-muted-foreground uppercase tracking-widest truncate">
                            {task.project.name}
                        </p>
                    )}

                    <div className="pt-1 sm:pt-2 flex items-center justify-between border-t border-border">
                        <div className="flex items-center gap-1 sm:gap-2">
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="flex -space-x-1 sm:-space-x-1.5">
                                    {task.assignees.slice(0, 3).map(({ user }) => (
                                        <div key={user.id} className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border-2 border-card ring-1 ring-border overflow-hidden bg-muted">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[5px] sm:text-[7px] font-black text-muted-foreground Montserrat">
                                                    {user.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {task.assignees.length > 3 && (
                                        <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[5px] sm:text-[7px] text-foreground font-black Montserrat">
                                            +{task.assignees.length - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-muted flex items-center justify-center border border-border">
                                    <User className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        {task.dueDate && (
                            <div className={`flex items-center gap-0.5 sm:gap-1.5 text-[7px] sm:text-[10px] font-black Montserrat tracking-tighter ${new Date(task.dueDate) < new Date() ? 'text-destructive' : 'text-muted-foreground'}`}>
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