"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { TaskWithAssignee } from "./TaskCard";
import { updateTaskStatusAction } from "@/app/dashboard/tasks/actions";
import type { TaskStatus } from "@/lib/types";
import { useTaskForm } from "@/app/dashboard/task-form-context";

export interface BoardColumn {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "todo",        label: "To Do",        color: "#888888" },
  { id: "in_progress", label: "In Progress",  color: "#5e6ad2" },
  { id: "done",        label: "Done",         color: "#26c97f" },
];

interface TaskBoardProps {
  initialTasks: TaskWithAssignee[];
  columns?: BoardColumn[];
  onTaskClick?: (task: TaskWithAssignee) => void;
  isAdmin?: boolean;
}

export function TaskBoard({ initialTasks, columns, onTaskClick, isAdmin = false }: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const { openTaskForm, currentMemberId } = useTaskForm();

  const cols = columns ?? DEFAULT_COLUMNS;

  function canDrag(task: TaskWithAssignee): boolean {
    if (isAdmin) return true;
    if (!currentMemberId) return false;
    return task.assignee_id === currentMemberId;
  }

  const pendingUpdatesRef = useRef<Map<string, TaskStatus>>(new Map());

  useEffect(() => {
    setTasks((prev) => {
      if (pendingUpdatesRef.current.size === 0) return initialTasks;
      return initialTasks.map((task) => {
        const pendingStatus = pendingUpdatesRef.current.get(task.id);
        return pendingStatus ? { ...task, status: pendingStatus } : task;
      });
    });
  }, [initialTasks]);

  const tasksByStatus: Record<string, TaskWithAssignee[]> = {};
  for (const col of cols) {
    tasksByStatus[col.id] = tasks.filter((t) => t.status === col.id);
  }

  const onDragEnd = useCallback(async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (draggedTask && !canDrag(draggedTask)) return;

    const newStatus = destination.droppableId as TaskStatus;
    pendingUpdatesRef.current.set(draggableId, newStatus);

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    const updateResult = await updateTaskStatusAction(draggableId, newStatus);
    pendingUpdatesRef.current.delete(draggableId);

    if (updateResult?.error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: source.droppableId as TaskStatus } : t
        )
      );
    } else {
      router.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-1">
      <div className="flex flex-col lg:flex-row gap-4 p-4 lg:min-w-[780px]">
        {cols.map((col) => {
          const colTasks = tasksByStatus[col.id] ?? [];
          return (
            <div key={col.id} className="flex w-full lg:flex-1 lg:min-w-[240px] lg:max-w-[420px] flex-col">
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }} />
                  <h3 className="text-[13px] font-medium" style={{ color: col.color }}>
                    {col.label}
                  </h3>
                </div>
                <span className="text-[12px] font-medium text-[var(--text-faint)]">
                  {colTasks.length}
                </span>
              </div>

              {/* Drop zone */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      "flex flex-col gap-2 rounded-lg p-2 min-h-[240px]",
                      "border",
                      snapshot.isDraggingOver
                        ? "border-[var(--accent-border)] bg-[var(--tint-accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--hover-subtle)]",
                      "transition-colors duration-150",
                    ].join(" ")}
                  >
                    {colTasks.map((task, index) => {
                      const locked = !canDrag(task);
                      return (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                          isDragDisabled={locked}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...(locked ? {} : dragProvided.dragHandleProps)}
                            >
                              <TaskCard
                                task={task}
                                onClick={onTaskClick}
                                isDragging={dragSnapshot.isDragging}
                                isLocked={locked}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-1 items-center justify-center py-8">
                        <p className="text-[12px] text-[var(--text-disabled)] select-none">Drop tasks here</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {col.id === "todo" && (
                <button
                  onClick={() => openTaskForm()}
                  className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5
                    text-[12px] text-[var(--text-faint)] hover:bg-[var(--hover-default)] hover:text-[var(--text-muted)]
                    transition-colors duration-150"
                >
                  <Plus size={13} />
                  Add task
                </button>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </DragDropContext>
  );
}

export default TaskBoard;
