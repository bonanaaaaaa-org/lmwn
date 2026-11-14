import type { z } from "zod";

import { env } from "@/lib/env";
import { takePreloadedResponse } from "@/lib/preloadPageData";

/** A non-2xx response from the API gateway. `detail` is the gateway's safe error message. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | undefined;

  constructor(status: number, detail: string | undefined) {
    super(detail ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** A 2xx response whose body did not match the expected schema (a contract drift). */
export class InvalidResponseError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(path: string, issues: z.core.$ZodIssue[]) {
    super(`Unexpected response shape from ${path}`);
    this.name = "InvalidResponseError";
    this.issues = issues;
  }
}

async function readDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const { detail } = body;
      return typeof detail === "string" ? detail : undefined;
    }
  } catch {
    // Not JSON — fall back to the generic message.
  }
  return undefined;
}

/**
 * GETs `path` from the API gateway and validates the JSON body with `schema`, so callers
 * receive typed, checked data. Throws ApiError for non-2xx responses and
 * InvalidResponseError when the body doesn't match the schema.
 */
export async function fetchJson<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  init?: RequestInit,
): Promise<z.output<Schema>> {
  const url = `${env.apiBaseUrl}${path}`;
  const request = () =>
    fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  // The page's first request may already be in flight from the document head; if that
  // one failed to reach the gateway, ask again.
  const preloaded = takePreloadedResponse(url);
  const response = preloaded ? await preloaded.catch(request) : await request();
  if (!response.ok) {
    throw new ApiError(response.status, await readDetail(response));
  }
  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new InvalidResponseError(path, result.error.issues);
  }
  return result.data;
}
