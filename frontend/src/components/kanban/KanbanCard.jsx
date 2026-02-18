import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, AlignLeft, Paperclip } from 'lucide-react';
import { priorityColors } from '@/lib/utils'; // Make sure this utility exists or redefine it locally

const KanbanCard = ({ task, isReadOnly }) => {
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
                className="opacity-50 h-[150px] bg-gray-100 rounded-lg border border-dashed border-gray-300" // Placeholder style
            />
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none">
            <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow duration-200">
                <CardHeader className="p-4 pb-2 space-y-0">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-0 ${priorityColors[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                            {task.priority || 'NORMAL'}
                        </Badge>
                        {/* You can add a menu or edit button here if needed */}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <CardTitle className="text-sm font-medium mb-2 line-clamp-2">
                        {task.title}
                    </CardTitle>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                        <div className="flex items-center gap-2">
                            {task.assignee ? (
                                <div className="flex items-center gap-1" title={task.assignee.name}>
                                    {task.assignee.avatar ? (
                                        <img src={task.assignee.avatar} alt={task.assignee.name} className="w-5 h-5 rounded-full" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {task.assignee.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                    <User className="w-3 h-3 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {task.dueDate && (
                            <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default KanbanCard;
