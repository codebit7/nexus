"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createPortalComment, getPortalTaskById } from "@/lib/db/portal";
import { getCsrfToken } from "@/lib/csrf";

export async function submitPortalComment(
  taskId: string,
  content: string,
  csrfToken: string
): Promise<{ error: string } | null> {
  // Resolve the portal client id from the cookie — never accept it from the caller.
  const clientId = cookies().get("portal_client_id")?.value;
  if (!clientId) {
    return { error: "Not authenticated." };
  }

  // Verify CSRF token
  const cookieToken = getCsrfToken();
  if (!csrfToken || !cookieToken || csrfToken.length !== cookieToken.length) {
    return { error: "Invalid or missing CSRF token. Please refresh and try again." };
  }
  let mismatch = 0;
  for (let i = 0; i < csrfToken.length; i++) {
    mismatch |= csrfToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return { error: "Invalid or missing CSRF token. Please refresh and try again." };
  }

  if (!content.trim()) return { error: "Comment cannot be empty." };

  try {
    // Verify the task belongs to this client before allowing comment
    const task = await getPortalTaskById(taskId, clientId);
    if (!task) return { error: "Task not found or access denied." };

    await createPortalComment(taskId, content.trim(), clientId);
    revalidatePath(`/portal/tasks/${taskId}`);
    return null;
  } catch (err) {
    return { error: "Failed to send comment. Please try again." };
  }
}
