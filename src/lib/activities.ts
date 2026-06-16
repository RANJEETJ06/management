// Activity vocabulary shared by the tasks manager and the calendar. Tasks were
// generalized into activities in Phase 2: a task, call, meeting, follow-up, or note.

import type { ActivityType, CommChannel, CommDirection } from "@/lib/types";

export const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
  { key: "task", label: "Task" },
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "follow_up", label: "Follow-up" },
  { key: "note", label: "Note" },
];

export function activityLabel(t: ActivityType): string {
  return ACTIVITY_TYPES.find((x) => x.key === t)?.label ?? t;
}

export const COMM_CHANNELS: { key: CommChannel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Call" },
  { key: "chat", label: "Chat" },
  { key: "other", label: "Other" },
];

export function channelLabel(c: CommChannel): string {
  return COMM_CHANNELS.find((x) => x.key === c)?.label ?? c;
}

export const COMM_DIRECTIONS: { key: CommDirection; label: string }[] = [
  { key: "outbound", label: "Outbound" },
  { key: "inbound", label: "Inbound" },
];
