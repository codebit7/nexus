import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Layers,
  Download,
  FolderOpen,
  FileImage,
  FileText,
  Sheet,
  Archive,
  Film,
  Paperclip,
} from "lucide-react";
import { getPortalFiles } from "@/lib/db/portal";
import type { PortalFileWithContext } from "@/lib/db/portal";

function getFileIcon(filename: string | null) {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return { Icon: FileImage, color: "text-sky-400", bg: "bg-sky-500/10" };
  if (ext === "pdf")
    return { Icon: FileText, color: "text-[var(--priority-urgent)]", bg: "bg-[var(--tint-red)]" };
  if (["doc", "docx"].includes(ext))
    return { Icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" };
  if (["xls", "xlsx", "csv"].includes(ext))
    return { Icon: Sheet, color: "text-[var(--status-done)]", bg: "bg-[var(--tint-green)]" };
  if (["zip", "rar", "tar", "gz"].includes(ext))
    return { Icon: Archive, color: "text-[var(--priority-high)]", bg: "bg-[var(--tint-orange)]" };
  if (["mp4", "mov", "avi"].includes(ext))
    return { Icon: Film, color: "text-purple-400", bg: "bg-purple-500/10" };
  return { Icon: Paperclip, color: "text-[var(--accent)]", bg: "bg-[var(--tint-accent-strong)]" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PortalFilesPage() {
  const cookieStore = cookies();
  const clientId = cookieStore.get("portal_client_id")?.value;
  if (!clientId) redirect("/portal/login");

  const files = await getPortalFiles(clientId);

  const projectGroups = new Map<string, { name: string; files: PortalFileWithContext[] }>();
  for (const file of files) {
    if (!projectGroups.has(file.projectId)) {
      projectGroups.set(file.projectId, { name: file.projectName, files: [] });
    }
    projectGroups.get(file.projectId)!.files.push(file);
  }
  const groups = Array.from(projectGroups.values());

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-[var(--text-faint)]" />
          <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Files</h1>
          <span className="text-[12px] text-[var(--text-faint)]">{files.length} total</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          {files.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] mb-4">
                <FolderOpen className="h-6 w-6 text-[var(--text-faint)]" />
              </div>
              <p className="text-[13px] text-[var(--text-muted)] mb-2">No files yet</p>
              <p className="text-[12px] text-[var(--text-fainter)]">
                Files shared by your team will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(({ name, files: groupFiles }) => (
                <div key={name}>
                  {/* Project group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--tint-accent)]">
                      <FolderOpen className="h-3.5 w-3.5 text-[var(--accent)]" />
                    </div>
                    <h2 className="text-[13px] font-medium text-[var(--text-primary)]">{name}</h2>
                    <span className="text-[11px] text-[var(--text-faint)]">
                      {groupFiles.length} {groupFiles.length === 1 ? "file" : "files"}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)] ml-1" />
                  </div>

                  {/* File table */}
                  <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                    {groupFiles.map((file, i) => {
                      const { Icon, color, bg } = getFileIcon(file.filename);
                      const ext = file.filename?.split(".").pop()?.toUpperCase() ?? "FILE";

                      return (
                        <div
                          key={file.id}
                          className={[
                            "group flex items-center gap-3 px-4 py-2.5",
                            i < groupFiles.length - 1
                              ? "border-b border-[var(--border-subtle)]"
                              : "",
                            "hover:bg-[var(--bg-input)] transition-colors duration-[120ms]",
                          ].join(" ")}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--text-secondary)] truncate">
                              {file.filename ?? "Untitled file"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${bg} ${color}`}
                              >
                                {ext}
                              </span>
                              {file.taskTitle && (
                                <span className="text-[11px] text-[var(--text-faint)] truncate">
                                  {file.taskTitle}
                                </span>
                              )}
                              {file.created_at && (
                                <span className="text-[11px] text-[var(--text-faint)] hidden sm:block">
                                  · {formatDate(file.created_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {file.file_url ? (
                            <a
                              href={file.file_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                                text-[12px] font-medium text-[var(--accent)] bg-[var(--tint-accent-strong)]
                                hover:bg-[var(--accent)] hover:text-white
                                transition-colors duration-150
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                            >
                              <Download className="h-3 w-3" />
                              <span className="hidden sm:inline">Download</span>
                            </a>
                          ) : (
                            <span className="shrink-0 text-[11px] text-[var(--text-disabled)] italic">
                              No file
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
