import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { ScrollArea } from '@/components/ui/scroll-area';

const KanbanColumn = ({ id, title, tasks, isReadOnly, onEdit }) => {
    const { setNodeRef } = useDroppable({
        id: id,
        data: {
            type: 'Column',
            columnId: id,
        },
    });

    const getColumnColor = (status) => {
        switch (status) {
            case 'TODO': return 'ring-1 ring-[#F59E0B]/30 bg-[#F59E0B]/5';
            case 'IN_PROGRESS': return 'ring-1 ring-[#00A3FF]/30 bg-[#00A3FF]/5';
            case 'IN_REVIEW': return 'ring-1 ring-[#D946EF]/30 bg-[#D946EF]/5';
            case 'COMPLETED': return 'ring-1 ring-[#48A111]/30 bg-[#48A111]/5';
            default: return 'ring-1 ring-white/10 bg-white/5';
        }
    };

    const getStatusDotColor = (status) => {
        switch (status) {
            case 'TODO': return '#F59E0B';
            case 'IN_PROGRESS': return '#00A3FF';
            case 'IN_REVIEW': return '#D946EF';
            case 'COMPLETED': return '#48A111';
            default: return '#94A3B8';
        }
    };

    return (
        <div className={`flex flex-col h-full flex-1 min-w-[220px] rounded-2xl p-2 transition-all duration-300 ${getColumnColor(id)}`}>
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-2 h-2 rounded-full shadow-[0_0_8px]"
                        style={{ backgroundColor: getStatusDotColor(id), boxShadow: `0 0 10px ${getStatusDotColor(id)}` }}
                    />
                    <h3 className="font-black text-[11px] uppercase tracking-widest text-white Montserrat">{title}</h3>
                </div>
                <span className="bg-white/10 text-white text-[10px] px-2.5 py-1 rounded-lg font-black Montserrat ring-1 ring-white/10">
                    {tasks.length}
                </span>
            </div>

            <ScrollArea className="flex-1 pr-1">
                <div ref={setNodeRef} className="flex flex-col gap-4 min-h-[150px] pb-4">
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                            <KanbanCard key={task.id} task={task} isReadOnly={isReadOnly} onEdit={onEdit} />
                        ))}
                    </SortableContext>
                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/5 rounded-2xl text-gray-600 text-[10px] font-black uppercase tracking-widest Montserrat gap-2">
                            <span>Drop tasks here</span>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default KanbanColumn;
