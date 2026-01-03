"use server";

import { getAuthToken } from "@/api/auth-token";
import type { Project } from "@/api/project/projects";

// Base URL for relative endpoints. This should point to the trusted API host.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.example.com";

// Allow-list of hostnames that outgoing requests are permitted to target.
const ALLOWED_HOSTNAMES: readonly string[] = [
  new URL(API_BASE_URL).hostname,
];

function isAllowedHostname(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.includes(hostname);
}

type FetchWithKeyOptions = {
  endpoint: string;
  project: Project;
  timeout?: number;
} & (
  | {
      method: "POST" | "PUT";
      body: Record<string, unknown>;
    }
  | {
      method: "GET" | "DELETE";
    }
  );

function normalizeAndValidateEndpoint(endpoint: string): string {
  // If the endpoint is an absolute URL, only allow HTTPS and approved hostnames.
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS protocol is allowed for outgoing requests.");
    }
    if (!isAllowedHostname(url.hostname)) {
      throw new Error("Hostname is not allowed for outgoing requests.");
    }
    return url.toString();
  } catch {
    // If `endpoint` is not a valid absolute URL, treat it as a relative path.
    if (!endpoint.startsWith("/")) {
      throw new Error("Relative endpoints must start with '/'.");
    }
    if (endpoint.includes("..")) {
      throw new Error("Path traversal is not allowed in endpoint.");
    }
    // Construct a full URL under the trusted API base to avoid SSRF.
    const url = new URL(endpoint, API_BASE_URL);
    return url.toString();
  }
}

export async function fetchWithAuthToken(options: FetchWithKeyOptions) {
  const timeout = options.timeout || 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error("No auth token found");
    }
    const safeEndpoint = normalizeAndValidateEndpoint(options.endpoint);
    const response = await fetch(safeEndpoint, {
      body: "body" in options ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
        "x-team-id": options.project.teamId,
        "x-client-id": options.project.publishableKey,
        "Content-Type": "application/json",
      },
      method: options.method,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 504) {
        throw new Error("Request timed out. Please try again.");
      }

      const data = await response.text();
      throw new Error(`HTTP error! status: ${response.status}: ${data}`);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
