import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({ id, title, tasks, isReadOnly, onEdit }) => {
    const { setNodeRef } = useDroppable({
        id,
        data: {
            type: 'Column',
            status: id,
        },
    });

    const statusStyles = {
        TODO: {
            dot: 'bg-amber-500',
            bg: 'bg-amber-500/5',
            border: 'border-amber-500/10',
            glow: 'shadow-[0_0_40px_rgba(245,158,11,0.05)]',
            text: 'text-amber-500/80'
        },
        IN_PROGRESS: {
            dot: 'bg-blue-500',
            bg: 'bg-blue-500/5',
            border: 'border-blue-500/10',
            glow: 'shadow-[0_0_40px_rgba(59,130,246,0.05)]',
            text: 'text-blue-500/80'
        },
        IN_REVIEW: {
            dot: 'bg-purple-500',
            bg: 'bg-purple-500/5',
            border: 'border-purple-500/10',
            glow: 'shadow-[0_0_40px_rgba(168,85,247,0.05)]',
            text: 'text-purple-500/80'
        },
        COMPLETED: {
            dot: 'bg-emerald-500',
            bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/10',
            glow: 'shadow-[0_0_40px_rgba(16,185,129,0.05)]',
            text: 'text-emerald-500/80'
        },
    };

    const style = statusStyles[id] || statusStyles.TODO;

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col min-w-[280px] min-h-full ${style.bg} ${style.glow} backdrop-blur-md rounded-2xl border ${style.border} overflow-hidden group/column transition-all duration-500 hover:border-white/10`}
        >
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${style.dot} shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                    <h2 className={`text-[10px] font-black Montserrat uppercase tracking-[0.2em] ${style.text} group-hover/column:text-white transition-colors`}>
                        {title}
                    </h2>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 text-[9px] font-black Montserrat text-gray-500 group-hover/column:text-white transition-colors">
                    {tasks.length}
                </div>
            </div>

            <div className="flex-1 p-3 space-y-2">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <KanbanCard key={task.id} task={task} isReadOnly={isReadOnly} onEdit={onEdit} columnStatus={id} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/[0.02] rounded-3xl text-gray-700 text-[10px] font-black uppercase tracking-widest Montserrat gap-3 group-hover/column:border-white/5 transition-all">
                        <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center border ${style.border}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${style.dot} opacity-20`} />
                        </div>
                        <span>Empty Stage</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;
