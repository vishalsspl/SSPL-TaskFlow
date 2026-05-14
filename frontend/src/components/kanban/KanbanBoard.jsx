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

// Priority order: URGENT > CRITICAL > HIGH > MEDIUM > LOW
const PRIORITY_ORDER = { URGENT: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

const sortByPriority = (tasks) => {
    return [...tasks].sort((a, b) => {
        const aPrio = PRIORITY_ORDER[a.priority] ?? 99;
        const bPrio = PRIORITY_ORDER[b.priority] ?? 99;
        return aPrio - bPrio;
    });
};

const KanbanBoard = ({ tasks, onTaskUpdate, isReadOnly, onEdit, onDelete, onStatusChange }) => {
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

    const handleDragStart = (event) => {
        if (isReadOnly) return;
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        setActiveId(null);
        if (isReadOnly) return;

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
        TODO: sortByPriority(tasks.filter(t => t.status === 'TODO')),
        IN_PROGRESS: sortByPriority(tasks.filter(t => t.status === 'IN_PROGRESS')),
        IN_REVIEW: sortByPriority(tasks.filter(t => t.status === 'IN_REVIEW')),
        COMPLETED: sortByPriority(tasks.filter(t => t.status === 'COMPLETED')),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full gap-2 sm:gap-4 overflow-x-auto pb-4 px-1 sm:px-0 no-scrollbar scroll-smooth snap-x snap-mandatory">
                <KanbanColumn id="TODO" title="To Do" tasks={columns.TODO} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} />
                <KanbanColumn id="IN_PROGRESS" title="In Progress" tasks={columns.IN_PROGRESS} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} />
                <KanbanColumn id="IN_REVIEW" title="In Review" tasks={columns.IN_REVIEW} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} />
                <KanbanColumn id="COMPLETED" title="Completed" tasks={columns.COMPLETED} isReadOnly={isReadOnly} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} recentlyMovedId={recentlyMovedId} />
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask ? <KanbanCard task={activeTask} /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export default KanbanBoard;