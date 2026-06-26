// Client-side notification creation utilities.
// Used by the friends page and other features to create notifications
// for other users when events happen (friend requests, accepts, etc.)

import { createClient } from "@/lib/supabase/client";

export type NotificationType =
  | "friend_request"
  | "friend_accept"
  | "achievement"
  | "system";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  fromUser?: string;
  link?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    from_user: input.fromUser ?? null,
    link: input.link ?? "",
  });

  if (error) {
    console.error("[notifications] Failed to create:", error.message);
  }
}
