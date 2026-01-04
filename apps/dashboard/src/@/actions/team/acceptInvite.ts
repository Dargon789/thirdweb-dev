"use server";

import { getAuthToken } from "@/api/auth-token";
import { NEXT_PUBLIC_THIRDWEB_API_HOST } from "@/constants/public-envs";

function validatePathId(value: string, fieldName: string): string {
  // Allow only URL-safe identifier characters to avoid path traversal
  // or injection of additional path segments.
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return value;
}

export async function acceptInvite(options: {
  teamId: string;
  inviteId: string;
}) {
  let teamId: string;
  let inviteId: string;
  try {
    teamId = validatePathId(options.teamId, "teamId");
    inviteId = validatePathId(options.inviteId, "inviteId");
  } catch (e) {
    return {
      errorMessage: "Invalid invite parameters",
      ok: false,
    };
  }

  const token = await getAuthToken();

  if (!token) {
    return {
      errorMessage: "You are not authorized to perform this action",
      ok: false,
    };
  }

  const res = await fetch(
    `${NEXT_PUBLIC_THIRDWEB_API_HOST}/v1/teams/${teamId}/invites/${inviteId}/accept`,
    {
      body: JSON.stringify({}),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!res.ok) {
    let errorMessage = "Failed to accept invite";
    try {
      const result = (await res.json()) as {
        error: {
          code: string;
          message: string;
          statusCode: number;
        };
      };
      errorMessage = result.error.message;
    } catch {}

    return {
      errorMessage,
      ok: false,
    };
  }

  return {
    ok: true,
  };
}
