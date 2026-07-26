import type { CardPriority } from "@/types/database";

export function ticketKey(ticketNumber: number): string {
  return `KAN-${ticketNumber}`;
}

export function priorityLabel(priority: CardPriority): string {
  if (priority === "high") return "High";
  if (priority === "low") return "Low";
  return "Medium";
}

export function profileLabel(profile: {
  full_name: string;
  email: string;
} | null | undefined): string {
  if (!profile) return "Unassigned";
  return profile.full_name.trim() || profile.email;
}

export function actorLabel(profile: {
  full_name: string;
  email: string;
} | null | undefined): string {
  if (!profile) return "Someone";
  return profile.full_name.trim() || profile.email;
}

export function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");

  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");

  const absHour = Math.round(absMin / 60);
  if (absHour < 24) return rtf.format(Math.round(diffMs / 3600000), "hour");

  return rtf.format(Math.round(diffMs / 86400000), "day");
}
