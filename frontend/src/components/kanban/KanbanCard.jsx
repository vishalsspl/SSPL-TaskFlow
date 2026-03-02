import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { priorityColors } from '@/lib/utils';

const KanbanCard = ({ task, isReadOnly, onEdit, columnStatus }) => {
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

    const statusAccents = {
        TODO: 'border-l-amber-500/50',
        IN_PROGRESS: 'border-l-blue-500/50',
        IN_REVIEW: 'border-l-purple-500/50',
        COMPLETED: 'border-l-emerald-500/50',
    };

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
                className="opacity-50 h-[120px] bg-white/[0.02] rounded-2xl border border-dashed border-white/10 mb-3"
            />
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none group">
            <Card
                className={`bg-[#0A0A0A]/60 backdrop-blur-md border-white/5 ring-1 ring-white/10 cursor-grab active:cursor-grabbing hover:ring-primary/40 hover:bg-white/5 transition-all duration-300 rounded-xl overflow-hidden shadow-xl border-l-[3px] ${statusAccents[columnStatus] || 'border-l-transparent'}`}
                onClick={() => onEdit && onEdit(task)}
            >
                <div className="p-3">
                    <div className="flex justify-between items-start gap-3 mb-2">
                        <Badge className={`${priorityColors[task.priority] || 'bg-white/5'} border-none text-[8px] font-black Montserrat uppercase px-2 py-0.5 rounded-md`}>
                            {task.priority}
                        </Badge>
                        {task.storyPoints > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5">
                                <div className="w-1 h-1 rounded-full bg-primary" />
                                <span className="text-[9px] font-black text-primary Montserrat tracking-tighter">{task.storyPoints} PTS</span>
                            </div>
                        )}
                    </div>

                    <h3 className="text-[13px] font-bold text-white mb-1 Montserrat leading-snug group-hover:text-primary transition-colors">
                        {task.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[9px] font-black text-gray-500 Montserrat uppercase tracking-widest">
                            {task.project?.name || 'Global HQ'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
                        <div className="flex -space-x-1.5">
                            {task.assignees?.map((assignee, idx) => (
                                <Avatar key={idx} className="w-6 h-6 border-2 border-[#0A0A0A] ring-1 ring-white/5">
                                    <AvatarImage src={assignee.user.avatar} />
                                    <AvatarFallback className="text-[9px] font-black bg-primary/10 text-primary Montserrat">
                                        {assignee.user.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.01] border border-white/5">
                            <Calendar className="w-3 h-3 text-gray-600" />
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest Montserrat">
                                {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Standby'}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default KanbanCard;
