"use server";
import "server-only";

import { getAuthToken } from "@/api/auth-token";
import { NEXT_PUBLIC_THIRDWEB_API_HOST } from "@/constants/public-envs";

function isValidTeamIdOrSlug(value: string): boolean {
  // Allow common slug characters only: letters, digits, dash, underscore, and dot.
  // Adjust the pattern if the backend expects a different format.
  const slugPattern = /^[a-zA-Z0-9._-]{1,128}$/;
  return slugPattern.test(value);
}

export async function createDedicatedSupportChannel(
  teamIdOrSlug: string,
  channelType: "slack" | "telegram",
): Promise<{ error: string | null }> {
  const token = await getAuthToken();
  if (!token) {
    return { error: "Unauthorized" };
  }

  if (!isValidTeamIdOrSlug(teamIdOrSlug)) {
    return { error: "Invalid team identifier." };
  }

  const safeTeamIdOrSlug = encodeURIComponent(teamIdOrSlug);

  const res = await fetch(
    new URL(
      `/v1/teams/${safeTeamIdOrSlug}/dedicated-support-channel`,
      NEXT_PUBLIC_THIRDWEB_API_HOST,
    ),
    {
      body: JSON.stringify({
        type: channelType,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  if (!res.ok) {
    const json = await res.json();
    return {
      error:
        json.error?.message ?? "Failed to create dedicated support channel.",
    };
  }
  return { error: null };
}
