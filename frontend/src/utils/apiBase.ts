/** Base API : toujours relative en production sur vote.cantic-mali.com (proxy PHP). */
export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname === "vote.cantic-mali.com") {
    return "/api";
  }
  return import.meta.env.VITE_API_BASE ?? "/api";
}

export function isProductionSite(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "vote.cantic-mali.com";
}
