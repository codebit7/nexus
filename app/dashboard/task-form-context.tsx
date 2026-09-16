"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TaskFormDialog } from "@/components/tasks/TaskForm";
import { fetchTaskFormDataAction } from "./actions";
import type { Project, TeamMember } from "@/lib/types";
import type { TaskStatusRow } from "@/lib/db/task-statuses";
import type { TagRow } from "@/lib/db/tags";

interface TaskFormContextValue {
  openTaskForm: (defaultProjectId?: string, defaultStatus?: string) => void;
  currentMemberId?: string;
  isAdmin?: boolean;
}

const TaskFormContext = createContext<TaskFormContextValue>({
  openTaskForm: () => {},
  currentMemberId: undefined,
  isAdmin: false,
});

export function useTaskForm() {
  return useContext(TaskFormContext);
}

interface FormData {
  projects: Project[];
  teamMembers: TeamMember[];
  taskStatuses: TaskStatusRow[];
  tags: TagRow[];
}

const EMPTY_FORM_DATA: FormData = {
  projects: [],
  teamMembers: [],
  taskStatuses: [],
  tags: [],
};

export function TaskFormProvider({
  children,
  currentMemberId,
  isAdmin,
}: {
  children: ReactNode;
  currentMemberId?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<string | undefined>();

  // Fetched when the form first opens, then kept. Previously the dashboard
  // layout loaded this on every navigation, which delayed every page's skeleton
  // — a layout must finish before any child loading.tsx can render.
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const loadedRef = useRef(false);

  function openTaskForm(projectId?: string, status?: string) {
    setDefaultProjectId(projectId);
    setDefaultStatus(status);
    setOpen(true);

    if (!loadedRef.current) {
      loadedRef.current = true;
      fetchTaskFormDataAction()
        .then(setFormData)
        .catch(() => {
          // Let the user retry on the next open rather than leaving the form
          // permanently empty.
          loadedRef.current = false;
        });
    }
  }

  // Global "C" keyboard shortcut — skip when focus is in an input/textarea/select
  // or when any other dialog (including the task form itself) is already open.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;
      // Don't stack — if the form is already open, or any other modal dialog
      // is currently mounted in the DOM, bail out.
      if (open) return;
      if (typeof document !== "undefined") {
        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (openDialog) return;
      }
      e.preventDefault();
      openTaskForm();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <TaskFormContext.Provider value={{ openTaskForm, currentMemberId, isAdmin }}>
      {children}
      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultProjectId={defaultProjectId}
        defaultStatus={defaultStatus}
        defaultAssigneeId={currentMemberId}
        isAdmin={isAdmin}
        onSuccess={() => router.refresh()}
        initialProjects={formData.projects}
        initialTeamMembers={formData.teamMembers}
        initialTaskStatuses={formData.taskStatuses}
        initialTags={formData.tags}
      />
    </TaskFormContext.Provider>
  );
}
