import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { ScrollArea } from '@/components/ui/scroll-area';

const KanbanColumn = ({ id, title, tasks, isReadOnly }) => {
    const { setNodeRef } = useDroppable({
        id: id,
        data: {
            type: 'Column',
            columnId: id,
        },
    });

    const getColumnColor = (status) => {
        switch (status) {
            case 'TODO': return 'border-muted-foreground/30 bg-muted/40';
            case 'IN_PROGRESS': return 'border-blue-400/60 bg-blue-500/10';
            case 'IN_REVIEW': return 'border-purple-400/60 bg-purple-500/10';
            case 'COMPLETED': return 'border-green-400/60 bg-green-500/10';
            default: return 'border-border bg-muted/40';
        }
    };

    return (
        <div className={`flex flex-col h-full flex-1 min-w-0 rounded-lg p-4 border-t-4 ${getColumnColor(id)}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <span className="bg-card text-muted-foreground text-xs px-2 py-1 rounded-full font-medium border shadow-sm">
                    {tasks.length}
                </span>
            </div>

            <ScrollArea className="flex-1 pr-3 -mr-3">
                <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[150px] pb-4">
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                            <KanbanCard key={task.id} task={task} isReadOnly={isReadOnly} />
                        ))}
                    </SortableContext>
                    {tasks.length === 0 && (
                        <div className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm">
                            Drop tasks here
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default KanbanColumn;
