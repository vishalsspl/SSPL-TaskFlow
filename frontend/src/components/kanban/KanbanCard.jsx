import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, AlignLeft, Paperclip } from 'lucide-react';
import { priorityColors } from '@/lib/utils'; // Make sure this utility exists or redefine it locally

const KanbanCard = ({ task, isReadOnly, onEdit }) => {
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-1 touch-none group">
            <Card
                className="bg-[#0A0A0A]/60 backdrop-blur-sm border-white/5 ring-1 ring-white/10 cursor-grab active:cursor-grabbing hover:ring-primary/40 hover:bg-white/5 transition-all duration-300 rounded-xl overflow-hidden shadow-xl"
                onClick={() => onEdit && onEdit(task)}
            >
                <div className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                        <Badge className={`${priorityColors[task.priority] || 'bg-white/5 text-gray-500'} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-sm`}>
                            {task.priority || 'NORMAL'}
                        </Badge>
                        {task.storyPoints > 0 && (
                            <span className="text-[10px] font-black Montserrat text-primary/80 px-1.5 py-0.5 bg-primary/10 rounded tracking-tighter">
                                {task.storyPoints} PTS
                            </span>
                        )}
                    </div>

                    <h4 className="text-sm font-bold text-white Montserrat leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {task.title}
                    </h4>

                    {task.project && (
                        <p className="text-[10px] font-black Montserrat text-gray-600 uppercase tracking-widest truncate">
                            {task.project.name}
                        </p>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-2">
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="flex -space-x-1.5">
                                    {task.assignees.slice(0, 3).map(({ user }) => (
                                        <div key={user.id} className="w-5 h-5 rounded-full border-2 border-[#0A0A0A] ring-1 ring-white/10 overflow-hidden bg-white/5">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-white/50 Montserrat">
                                                    {user.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {task.assignees.length > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-white/10 border-2 border-[#0A0A0A] flex items-center justify-center text-[7px] text-white font-black Montserrat">
                                            +{task.assignees.length - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <User className="w-2.5 h-2.5 text-gray-600" />
                                </div>
                            )}
                        </div>

                        {task.dueDate && (
                            <div className={`flex items-center gap-1.5 text-[10px] font-black Montserrat tracking-tighter ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                                <Calendar className="w-3 h-3" />
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
