import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { createPortal } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Priority order: URGENT > HIGH > MEDIUM > LOW
const PRIORITY_ORDER = { URGENT: 0, HIGH: 2, MEDIUM: 3, LOW: 4 };

const COLUMN_IDS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
const COLUMN_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', COMPLETED: 'Completed' };
const COLUMN_COLORS = { TODO: '#F59E0B', IN_PROGRESS: '#00A3FF', IN_REVIEW: '#D946EF', COMPLETED: '#48A111' };

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
    onCardClick,
    onDelete, 
    onStatusChange,
    onApprove,
    onReject,
    currentUser,
    highlightTaskId,
    highlightAction,
    onBulkApprove,
    onBulkReject
}) => {
    const { toast } = useToast();
    const [activeId, setActiveId] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [recentlyMovedId, setRecentlyMovedId] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [activeColumnIndex, setActiveColumnIndex] = useState(0);
    const scrollRef = useRef(null);
    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track which column is visible via scroll position
    const handleScroll = useCallback(() => {
        const container = scrollRef.current;
        if (!container || !isMobile) return;
        const scrollLeft = container.scrollLeft;
        const columnWidth = container.scrollWidth / 4;
        const index = Math.round(scrollLeft / columnWidth);
        setActiveColumnIndex(Math.min(Math.max(index, 0), 3));
    }, [isMobile]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Clear the highlight after 2 seconds
    useEffect(() => {
        if (recentlyMovedId) {
            const timer = setTimeout(() => setRecentlyMovedId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [recentlyMovedId]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const canMoveCards = currentUser?.role === 'ADMIN' || currentUser?.permissions?.['kanban.moveCards'];
    const actuallyDisableDrag = isReadOnly || !canMoveCards || isMobile;

    const scrollToColumn = (index) => {
        const container = scrollRef.current;
        if (!container) return;
        const columnWidth = container.scrollWidth / 4;
        container.scrollTo({ left: columnWidth * index, behavior: 'smooth' });
        setActiveColumnIndex(index);
    };

    const goLeft = () => {
        if (activeColumnIndex > 0) scrollToColumn(activeColumnIndex - 1);
    };

    const goRight = () => {
        if (activeColumnIndex < 3) scrollToColumn(activeColumnIndex + 1);
    };

    const handleDragStart = (event) => {
        if (actuallyDisableDrag) return;
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        setActiveId(null);
        if (actuallyDisableDrag) return;

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
                    const targetIndex = COLUMN_IDS.indexOf(newStatus);
                    if (targetIndex !== -1) {
                        setTimeout(() => scrollToColumn(targetIndex), 100);
                    }
                }
            }
            onTaskUpdate(activeTaskId, newStatus);
        }
    };

    const handleManualStatusChange = (taskId, newStatus) => {
        setRecentlyMovedId(taskId);
        
        // Auto-scroll on mobile
        if (window.innerWidth < 768) {
            const targetIndex = COLUMN_IDS.indexOf(newStatus);
            if (targetIndex !== -1) {
                setTimeout(() => scrollToColumn(targetIndex), 100);
            }
        }

        if (onStatusChange) {
            onStatusChange(taskId, newStatus);
        }
    };

    const columns = {
        TODO: sortTasks(tasks.filter(t => t.status === 'TODO'), 'TODO'),
        IN_PROGRESS: sortTasks(tasks.filter(t => t.status === 'IN_PROGRESS'), 'IN_PROGRESS'),
        IN_REVIEW: sortTasks(tasks.filter(t => t.status === 'IN_REVIEW'), 'IN_REVIEW'),
        COMPLETED: sortTasks(tasks.filter(t => t.status === 'COMPLETED'), 'COMPLETED'),
    };

    const toggleTaskSelection = (taskId) => {
        setSelectedTasks(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const handleBulkApproveClick = () => {
        if (onBulkApprove && selectedTasks.length > 0) {
            onBulkApprove(selectedTasks);
            setSelectedTasks([]);
        }
    };

    const handleBulkRejectClick = () => {
        if (onBulkReject && selectedTasks.length > 0) {
            onBulkReject(selectedTasks);
            setSelectedTasks([]);
        }
    };

    const handleToggleSelectAll = (columnTasks, isSelected) => {
        const taskIds = columnTasks.map(t => t.id);
        if (isSelected) {
            setSelectedTasks(prev => [...new Set([...prev, ...taskIds])]);
        } else {
            setSelectedTasks(prev => prev.filter(id => !taskIds.includes(id)));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="relative h-full flex flex-col">
                {/* Columns container */}
                <div ref={scrollRef} className="flex flex-1 min-h-0 w-full gap-2 sm:gap-4 overflow-x-auto pb-0 sm:pb-4 px-1 sm:px-0 no-scrollbar scroll-smooth snap-x snap-mandatory">
                    <KanbanColumn id="TODO" title="To Do" tasks={columns.TODO} isReadOnly={isReadOnly} disableDrag={actuallyDisableDrag} onEdit={onEdit} onCardClick={onCardClick} onDelete={onDelete} onStatusChange={handleManualStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} selectedTasks={selectedTasks} onToggleSelect={toggleTaskSelection} onToggleSelectAll={handleToggleSelectAll} onBulkApprove={handleBulkApproveClick} onBulkReject={handleBulkRejectClick} currentUser={currentUser} />
                    <KanbanColumn id="IN_PROGRESS" title="In Progress" tasks={columns.IN_PROGRESS} isReadOnly={isReadOnly} disableDrag={actuallyDisableDrag} onEdit={onEdit} onCardClick={onCardClick} onDelete={onDelete} onStatusChange={handleManualStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} selectedTasks={selectedTasks} onToggleSelect={toggleTaskSelection} onToggleSelectAll={handleToggleSelectAll} onBulkApprove={handleBulkApproveClick} onBulkReject={handleBulkRejectClick} currentUser={currentUser} />
                    <KanbanColumn id="IN_REVIEW" title="In Review" tasks={columns.IN_REVIEW} isReadOnly={isReadOnly} disableDrag={actuallyDisableDrag} onEdit={onEdit} onCardClick={onCardClick} onDelete={onDelete} onStatusChange={handleManualStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} selectedTasks={selectedTasks} onToggleSelect={toggleTaskSelection} onToggleSelectAll={handleToggleSelectAll} onBulkApprove={handleBulkApproveClick} onBulkReject={handleBulkRejectClick} currentUser={currentUser} />
                    <KanbanColumn id="COMPLETED" title="Completed" tasks={columns.COMPLETED} isReadOnly={isReadOnly} disableDrag={actuallyDisableDrag} onEdit={onEdit} onCardClick={onCardClick} onDelete={onDelete} onStatusChange={handleManualStatusChange} recentlyMovedId={recentlyMovedId} highlightTaskId={highlightTaskId} highlightAction={highlightAction} onApprove={onApprove} onReject={onReject} selectedTasks={selectedTasks} onToggleSelect={toggleTaskSelection} onToggleSelectAll={handleToggleSelectAll} onBulkApprove={handleBulkApproveClick} onBulkReject={handleBulkRejectClick} currentUser={currentUser} />
                </div>

                {/* Mobile Navigation Bar */}
                {isMobile && (
                    <div className="shrink-0 flex items-center justify-between gap-2 px-2 py-2 bg-card/80 backdrop-blur-md border-t border-border rounded-b-xl">
                        {/* Left Arrow */}
                        <button
                            onClick={goLeft}
                            disabled={activeColumnIndex === 0}
                            className={`p-2 rounded-xl transition-all ${activeColumnIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'bg-secondary/60 hover:bg-secondary active:scale-90 text-foreground shadow-md'}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Column Indicator Dots + Label */}
                        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-black Montserrat uppercase tracking-widest truncate" style={{ color: COLUMN_COLORS[COLUMN_IDS[activeColumnIndex]] }}>
                                {COLUMN_LABELS[COLUMN_IDS[activeColumnIndex]]}
                            </span>
                            <div className="flex items-center gap-2">
                                {COLUMN_IDS.map((colId, i) => (
                                    <button
                                        key={colId}
                                        onClick={() => scrollToColumn(i)}
                                        className="p-0.5 transition-all"
                                    >
                                        <div
                                            className={`rounded-full transition-all duration-300 ${i === activeColumnIndex ? 'w-5 h-2' : 'w-2 h-2 opacity-40'}`}
                                            style={{ backgroundColor: COLUMN_COLORS[colId] }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Arrow */}
                        <button
                            onClick={goRight}
                            disabled={activeColumnIndex === 3}
                            className={`p-2 rounded-xl transition-all ${activeColumnIndex === 3 ? 'opacity-20 cursor-not-allowed' : 'bg-secondary/60 hover:bg-secondary active:scale-90 text-foreground shadow-md'}`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask ? <KanbanCard task={activeTask} isReadOnly={isReadOnly} disableDrag={actuallyDisableDrag} /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export default KanbanBoard;