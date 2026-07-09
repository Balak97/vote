export const APP_TIMEZONE = "Europe/Moscow";

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Les dates API sont stockées en UTC (souvent sans suffixe Z). */
export function parseUtcIso(iso: string): Date {
  const trimmed = iso.trim();
  if (!trimmed) return new Date(NaN);
  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}Z`);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseUtcIso(iso);
  if (Number.isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Interprète la valeur du champ datetime-local comme heure de Moscou (UTC+3). */
export function fromDatetimeLocalValue(value: string): string {
  if (!DATETIME_LOCAL_RE.test(value)) {
    return new Date(value).toISOString();
  }
  return new Date(`${value}:00+03:00`).toISOString();
}

export function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseUtcIso(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("fr-FR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) {
    return `${days}j ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

function moscowDatetimeLocal(addHours: number): string {
  const currentLocal = toDatetimeLocalValue(new Date().toISOString());
  const [datePart, timePart] = currentLocal.split("T");
  const hour = Number(timePart.split(":")[0] ?? 0);
  const rounded = `${datePart}T${String(hour).padStart(2, "0")}:00`;
  const shifted = new Date(parseUtcIso(fromDatetimeLocalValue(rounded)).getTime() + addHours * 3_600_000);
  return toDatetimeLocalValue(shifted.toISOString());
}

export function defaultElectionStartsAt(): string {
  return moscowDatetimeLocal(1);
}

export function defaultElectionEndsAt(): string {
  return moscowDatetimeLocal(25);
}
