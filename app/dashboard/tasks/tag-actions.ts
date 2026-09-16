"use server";

import { revalidatePath } from "next/cache";
import { getCallerOrgId } from "@/lib/db/team-members";
import { upsertTag, setTaskTags, type TagRow } from "@/lib/db/tags";

/** Create a new tag (or return the existing one with the same name). */
export async function createTagAction(
  name: string,
  color: string,
): Promise<{ tag?: TagRow; error?: string }> {
  try {
    const orgId = await getCallerOrgId();
    const tag = await upsertTag(orgId, name, color);
    revalidatePath("/dashboard", "layout");
    return { tag };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create tag" };
  }
}

/** Replace the entire tag set on a task. */
export async function setTaskTagsAction(
  taskId: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  try {
    await setTaskTags(taskId, tagIds);
    revalidatePath("/dashboard", "layout");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update tags" };
  }
}
