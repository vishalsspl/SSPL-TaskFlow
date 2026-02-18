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
            case 'TODO': return 'border-gray-400 bg-gray-50';
            case 'IN_PROGRESS': return 'border-blue-400 bg-blue-50';
            case 'IN_REVIEW': return 'border-purple-400 bg-purple-50';
            case 'COMPLETED': return 'border-green-400 bg-green-50';
            default: return 'border-gray-200 bg-gray-50';
        }
    };

    return (
        <div className={`flex flex-col h-full flex-1 min-w-0 rounded-lg p-4 border-t-4 ${getColumnColor(id)}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{title}</h3>
                <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full font-medium border shadow-sm">
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
                        <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">
                            Drop tasks here
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default KanbanColumn;
