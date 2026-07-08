export const ADMIN_AUTH_EVENT = "walata-admin-auth";

export function notifyAdminAuthChange() {
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

export function clearAdminSession() {
  localStorage.removeItem("admin_token");
  notifyAdminAuthChange();
}

export function isAdminLoggedIn(): boolean {
  return Boolean(localStorage.getItem("admin_token"));
}
