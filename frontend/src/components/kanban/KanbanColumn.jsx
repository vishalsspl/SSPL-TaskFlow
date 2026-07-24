import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({ id, title, tasks, isReadOnly, disableDrag, onEdit, onCardClick, onDelete, onStatusChange, recentlyMovedId, highlightTaskId, highlightAction, onApprove, onReject, selectedTasks, onToggleSelect, onBulkApprove, currentUser }) => {
    const { setNodeRef } = useDroppable({
        id: id,
        data: {
            type: 'Column',
            columnId: id,
        },
    });

    const getColumnColor = (status) => {
        switch (status) {
            case 'TODO': return 'ring-2 ring-[#F59E0B]/60 bg-[#F59E0B]/5';
            case 'IN_PROGRESS': return 'ring-2 ring-[#00A3FF]/60 bg-[#00A3FF]/5';
            case 'IN_REVIEW': return 'ring-2 ring-[#D946EF]/60 bg-[#D946EF]/5';
            case 'COMPLETED': return 'ring-2 ring-[#48A111]/60 bg-[#48A111]/5';
            default: return 'ring-2 ring-white/10 bg-white/5';
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
        <div 
            id={id}
            className={`flex flex-col flex-1 
            min-w-[calc(100vw-3rem)] 
            md:min-w-0
            rounded-2xl p-1 sm:p-2 mx-1 my-1 transition-all duration-300 snap-center overflow-hidden ${getColumnColor(id)}`}>
            <div className="flex items-center justify-between mb-3 px-1 shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-2 h-2 rounded-full shadow-[0_0_8px]"
                        style={{ backgroundColor: getStatusDotColor(id), boxShadow: `0 0 10px ${getStatusDotColor(id)}` }}
                    />
                    <h3 className="font-black text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-widest text-foreground Montserrat truncate max-w-[80px] sm:max-w-none">{title}</h3>
                </div>
                <span className="bg-foreground/10 text-foreground text-[8px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-black Montserrat ring-1 ring-foreground/10 shrink-0">
                    {tasks.length}
                </span>
            </div>

            {id === 'IN_REVIEW' && selectedTasks?.length > 0 && (
                <div className="mb-3 px-1 w-full">
                    <button
                        onClick={onBulkApprove}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-1.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                        Approve Selected ({selectedTasks.length})
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 min-h-0 kanban-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[150px] pb-4 w-full max-w-[600px] sm:max-w-none mx-auto items-center sm:items-stretch">
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                            <KanbanCard key={task.id} task={task} isReadOnly={isReadOnly} disableDrag={disableDrag} onEdit={onEdit} onCardClick={onCardClick} onDelete={onDelete} onStatusChange={onStatusChange} isHighlighted={task.id === recentlyMovedId || task.id === highlightTaskId} highlightAction={task.id === highlightTaskId ? highlightAction : null} onApprove={onApprove} onReject={onReject} isSelected={selectedTasks?.includes(task.id)} onToggleSelect={onToggleSelect} currentUser={currentUser} />
                        ))}
                    </SortableContext>
                    {tasks.length === 0 && (
                        <div className="hidden sm:flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/5 rounded-2xl text-gray-600 text-[10px] font-black uppercase tracking-widest Montserrat gap-2">
                            <span>Drop tasks here</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KanbanColumn;