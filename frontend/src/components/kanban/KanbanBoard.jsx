import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { createPortal } from 'react-dom';
import { useToast } from '@/hooks/use-toast';

// Priority order: URGENT > HIGH > MEDIUM > LOW
const PRIORITY_ORDER = { URGENT: 0, HIGH: 2, MEDIUM: 3, LOW: 4 };

const sortTasks = (tasks, columnId) => {
    if (columnId === 'COMPLETED') {
        // Sort by updatedAt descending
        return [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    
    // Sort by priority first
    let sorted = [...tasks].sort((a, b) => {
        const aPrio = PRIORITY_ORDER[a.priority] ?? 99;
        const bPrio = PRIORITY_ORDER[b.priority] ?? 99;
        return aPrio - bPrio;
    });

    if (columnId === 'IN_REVIEW') {
        // Pending approval tasks at the top
        sorted.sort((a, b) => {
            const aPending = a.tags?.some(t => t.startsWith('PENDING_APPROVAL:')) ? 1 : 0;
            const bPending = b.tags?.some(t => t.startsWith('PENDING_APPROVAL:')) ? 1 : 0;
            return bPending - aPending; // 1 goes before 0
        });
    }
    
    return sorted;
};

const KanbanBoard = ({ 
    tasks, 
    onTaskUpdate, 
    isReadOnly, 
    onEdit, 
    onDelete, 
    onStatusChange,
    onApprove,
    onReject,
    currentUser,
    highlightTaskId,
    highlightAction
}) => {
    const { toast } = useToast();
    const [activeId, setActiveId] = useState(null);
    const [recentlyMovedId, setRecentlyMovedId] = useState(null);
    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    // Clear the highlight after 2 seconds
    useEffect(() => {
        if (recentlyMovedId) {
            const timer = setTimeout(() => setRecentlyMovedId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [recentlyMovedId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const canMoveCards = currentUser?.role === 'ADMIN' || currentUser?.permissions?.['kanban.moveCards'];

    const handleDragStart = (event) => {
        if (isReadOnly || !canMoveCards) return;
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        setActiveId(null);
        if (isReadOnly || !canMoveCards) return;

        const { active, over } = event;
        if (!over) return;

        const activeTaskId = active.id;
        const overId = over.id;

        let newStatus = null;

        if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'].includes(overId)) {
            newStatus = overId;
        } else {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        if (newStatus) {
            const currentTask = tasks.find(t => t.id === activeTaskId);
            if (currentTask && currentTask.status !== newStatus) {
                // Restrictions for MEMBER role
                if (currentUser?.role === 'MEMBER') {
                    // Prevent moving out of COMPLETED
                    if (currentTask.status === 'COMPLETED') {
                        toast({ title: 'Not Allowed', description: 'Tasks that are Completed can only be moved by a Manager.', variant: 'destructive' });
                        return;
                    }
                    // Prevent moving into COMPLETED
                    if (newStatus === 'COMPLETED') {
                        toast({ title: 'Not Allowed', description: 'Members cannot move tasks directly to Completed. Please use In Review.', variant: 'destructive' });
                        return;
                    }
                }

                setRecentlyMovedId(activeTaskId);
                
                // Auto-scroll on mobile
                if (window.innerWidth < 768) {
                    setTimeout(() => {
                        const element = document.getElementById(newStatus);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    }, 100);
                }
            }
            onTaskUpdate(activeTaskId, newStatus);
        }
    };

    const columns = {
        TODO: sortTasks(tasks.filter(t => t.status === 'TODO'), 'TODO'),
        IN_PROGRESS: sortTasks(tasks.filter(t => t.status === 'IN_PROGRESS'), 'IN_PROGRESS'),
        IN_REVIEW: sortTasks(tasks.filter(t => t.status === 'IN_REVIEW'), 'IN_REVIEW'),
        COMPLETED: sortTasks(tasks.filter(t => t.status === 'COMPLETED'), 'COMPLETED'),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full gap-2 sm:gap-4 overflow-x-auto pb-4 px-1 sm:px-0 no-scrollbar scroll-smooth snap-x snap-mandatory">
                <KanbanColumn id="TODO" title="To Do" tasks={columns.TODO} isReadOnly={isReadOnly} disableDrag={isReadOnly || !canMoveCards} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} />
                <KanbanColumn id="IN_PROGRESS" title="In Progress" tasks={columns.IN_PROGRESS} isReadOnly={isReadOnly} disableDrag={isReadOnly || !canMoveCards} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} />
                <KanbanColumn id="IN_REVIEW" title="In Review" tasks={columns.IN_REVIEW} isReadOnly={isReadOnly} disableDrag={isReadOnly || !canMoveCards} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} />
                <KanbanColumn id="COMPLETED" title="Completed" tasks={columns.COMPLETED} isReadOnly={isReadOnly} disableDrag={isReadOnly || !canMoveCards} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} />
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask ? <KanbanCard task={activeTask} isReadOnly={isReadOnly} disableDrag={isReadOnly || !canMoveCards} /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export default KanbanBoard;