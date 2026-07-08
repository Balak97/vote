import { getApiBase, isProductionSite } from "./apiBase";

const API_BASE = getApiBase();
const IS_PRODUCTION = import.meta.env.PROD;
const IS_REMOTE_API = API_BASE.startsWith("http");
const WALATA_BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT ?? "8001";

const TIGER_PROTECT_MESSAGE =
  "Action bloquée par la protection O2Switch (Tiger Protect). L'administrateur doit désactiver Tiger Protect sur vote.cantic-mali.com et api.vote.cantic-mali.com, puis réessayer.";

function isBlockedHtml(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.startsWith("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("noindex, nofollow") ||
    lower.includes("tiger-protect")
  );
}

function sanitizeDetail(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (isBlockedHtml(trimmed)) return TIGER_PROTECT_MESSAGE;
  if (trimmed.length > 220) return `${trimmed.slice(0, 220)}…`;
  return trimmed;
}

function extractDetail(payload: unknown): string {
  if (typeof payload !== "object" || payload === null || !("detail" in payload)) {
    return "";
  }

  const detail = (payload as { detail: unknown }).detail;

  if (typeof detail === "string") {
    return sanitizeDetail(detail);
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return String(item);
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function networkErrorMessage(): string {
  if (isProductionSite() || IS_PRODUCTION || IS_REMOTE_API) {
    return "Impossible de contacter le serveur de vote. Vérifiez votre connexion internet et réessayez dans quelques instants.";
  }
  return `Impossible de joindre le backend (port ${WALATA_BACKEND_PORT}). Démarrez l'API : cd backend puis .\\start.ps1`;
}

export function formatHttpError(status: number, payload: unknown): string {
  const detail = extractDetail(payload);

  if (detail && detail !== "Not Found" && detail !== "Internal Server Error") {
    return detail;
  }

  switch (status) {
    case 307:
      return TIGER_PROTECT_MESSAGE;
    case 400:
      return detail || "Données invalides. Vérifiez les informations saisies.";
    case 422:
      return detail || "Formulaire invalide. Vérifiez tous les champs requis.";
    case 401:
      return detail || "Identifiants incorrects ou session expirée. Reconnectez-vous.";
    case 403:
      return detail || "Vous n'avez pas l'autorisation d'effectuer cette action.";
    case 404:
      if (!IS_PRODUCTION && !IS_REMOTE_API) {
        return `Backend Walata Vote introuvable sur le port ${WALATA_BACKEND_PORT}. Lancez : cd backend puis uvicorn app.main:app --reload --port ${WALATA_BACKEND_PORT}`;
      }
      return "Ressource introuvable sur le serveur de vote.";
    case 405:
      return "Action non autorisée sur cette ressource.";
    case 408:
      return "La requête a expiré. Réessayez.";
    case 429:
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case 500:
      return "Erreur interne du serveur. Réessayez dans quelques instants ou contactez l'administrateur.";
    case 502:
    case 503:
      if (detail) return detail;
      if (!IS_PRODUCTION && !IS_REMOTE_API) {
        return `Service indisponible (port ${WALATA_BACKEND_PORT}). Vérifiez que le backend est démarré.`;
      }
      return "Service temporairement indisponible. Réessayez dans quelques instants.";
    default:
      return detail || "Une erreur est survenue. Réessayez.";
  }
}

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg === "failed to fetch" ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("network request failed")
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return networkErrorMessage();
    }
    const msg = error.message.trim();
    if (msg && isBlockedHtml(msg)) return TIGER_PROTECT_MESSAGE;
    if (msg) return msg;
  }
  return "Une erreur inattendue est survenue. Réessayez.";
}

export async function parseErrorResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  try {
    const text = (await response.text()).trim();
    if (text) return { detail: sanitizeDetail(text) || text.slice(0, 300) };
  } catch {
    /* ignore */
  }

  return {};
}
