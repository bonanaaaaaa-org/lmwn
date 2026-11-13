const DEFAULT_API_BASE_URL = "http://localhost:4000";

export function resolveApiBaseUrl(value: string | undefined): string {
  const url = value?.trim() || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, "");
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
} as const;
