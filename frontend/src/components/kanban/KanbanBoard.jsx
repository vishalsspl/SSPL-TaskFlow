import React, { useState } from 'react';
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

const KanbanBoard = ({ tasks, onTaskUpdate, isReadOnly }) => {
    const [activeId, setActiveId] = useState(null);
    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Require 5px movement to start drag
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

        // If dropped on a column (empty or not)
        // logic depends on how we set up droppables.
        // If we drop on a column, over.id is the column ID (status).
        // If we drop on a card, over.data.current.sortable.containerId might be the column.

        let newStatus = null;

        // Check if dropped on a column directly
        if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'].includes(overId)) {
            newStatus = overId;
        } else {
            // Dropped on another card
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        if (newStatus) {
            onTaskUpdate(activeTaskId, newStatus);
        }
    };

    const columns = {
        TODO: tasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
        IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED'),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full gap-4">
                <KanbanColumn id="TODO" title="To Do" tasks={columns.TODO} isReadOnly={isReadOnly} />
                <KanbanColumn id="IN_PROGRESS" title="In Progress" tasks={columns.IN_PROGRESS} isReadOnly={isReadOnly} />
                <KanbanColumn id="IN_REVIEW" title="In Review" tasks={columns.IN_REVIEW} isReadOnly={isReadOnly} />
                <KanbanColumn id="COMPLETED" title="Completed" tasks={columns.COMPLETED} isReadOnly={isReadOnly} />
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
