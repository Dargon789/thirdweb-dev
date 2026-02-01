"use server";

import { getAuthToken } from "@/api/auth-token";
import { NEXT_PUBLIC_THIRDWEB_API_HOST } from "@/constants/public-envs";

function isValidTeamId(teamId: string): boolean {
  // Allow only alphanumeric characters, dashes and underscores, with a reasonable length bound.
  // This prevents path traversal sequences and other unexpected characters in the URL path.
  return /^[A-Za-z0-9_-]{1,128}$/.test(teamId);
}

export async function sendTeamInvites(options: {
  teamId: string;
  invites: Array<{ email: string; role: "OWNER" | "MEMBER" }>;
}): Promise<
  | {
      ok: true;
      results: Array<"fulfilled" | "rejected">;
    }
  | {
      ok: false;
      errorMessage: string;
    }
> {
  const token = await getAuthToken();

  if (!token) {
    return {
      errorMessage: "You are not authorized to perform this action",
      ok: false,
    };
  }

  if (!isValidTeamId(options.teamId)) {
    return {
      errorMessage: "Invalid team identifier",
      ok: false,
    };
  }

  const results = await Promise.allSettled(
    options.invites.map((invite) => sendInvite(options.teamId, invite, token)),
  );

  return {
    ok: true,
    results: results.map((x) => x.status),
  };
}

async function sendInvite(
  teamId: string,
  invite: { email: string; role: "OWNER" | "MEMBER" },
  token: string,
) {
  const res = await fetch(
    `${NEXT_PUBLIC_THIRDWEB_API_HOST}/v1/teams/${teamId}/invites`,
    {
      body: JSON.stringify({
        inviteEmail: invite.email,
        inviteRole: invite.role,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!res.ok) {
    const errorMessage = await res.text();
    return {
      email: invite.email,
      errorMessage,
      ok: false,
    };
  }

  return {
    email: invite.email,
    ok: true,
  };
}
