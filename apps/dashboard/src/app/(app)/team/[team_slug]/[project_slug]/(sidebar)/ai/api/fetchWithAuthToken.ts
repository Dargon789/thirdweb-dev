"use server";

import { getAuthToken } from "@/api/auth-token";
import type { Project } from "@/api/project/projects";

// Base URL for relative endpoints. This should point to the trusted API host.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.example.com";

// Helper to detect loopback or private hostnames / IPs to avoid SSRF to internal services.
function isLoopbackOrPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }

  const ipv4Match = lower.match(
    /^(?<a>\d{1,3})\.(?<b>\d{1,3})\.(?<c>\d{1,3})\.(?<d>\d{1,3})$/
  );

  if (ipv4Match && ipv4Match.groups) {
    const a = Number(ipv4Match.groups.a);
    const b = Number(ipv4Match.groups.b);

    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // 127.0.0.0/8
  }

  // Very small IPv6 check for loopback.
  if (lower === "0:0:0:0:0:0:0:1" || lower === "::1") {
    return true;
  }

  return false;
}

// Allow-list of hostnames that outgoing requests are permitted to target.
const ALLOWED_HOSTNAMES: readonly string[] = [
  // Only allow the hostname from the trusted API base URL, provided it is not private/loopback.
  ...(isLoopbackOrPrivateHostname(new URL(API_BASE_URL).hostname)
    ? []
    : [new URL(API_BASE_URL).hostname]),
];

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_TIMEOUT_MS = 60000;

function normalizeTimeout(timeout?: number): number {
  if (timeout === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  const numericTimeout = Number(timeout);

  if (!Number.isFinite(numericTimeout) || numericTimeout <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (numericTimeout > MAX_TIMEOUT_MS) {
    return MAX_TIMEOUT_MS;
  }

  return numericTimeout;
}

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
    if (isLoopbackOrPrivateHostname(url.hostname)) {
      throw new Error(
        "Loopback or private network hosts are not allowed for outgoing requests."
      );
    }
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
    const baseUrl = new URL(API_BASE_URL);
    if (baseUrl.protocol !== "https:") {
      throw new Error(
        "API_BASE_URL must use HTTPS protocol for outgoing requests."
      );
    }
    if (isLoopbackOrPrivateHostname(baseUrl.hostname)) {
      throw new Error(
        "API_BASE_URL must not point to a loopback or private network host."
      );
    }
    const url = new URL(endpoint, baseUrl);
    if (!isAllowedHostname(url.hostname)) {
      throw new Error("Hostname is not allowed for outgoing requests.");
    }
    if (isLoopbackOrPrivateHostname(url.hostname)) {
      throw new Error(
        "Loopback or private network hosts are not allowed for outgoing requests."
      );
    }
    return url.toString();
  }
}

export async function fetchWithAuthToken(options: FetchWithKeyOptions) {
  const timeout = normalizeTimeout(options.timeout);

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
