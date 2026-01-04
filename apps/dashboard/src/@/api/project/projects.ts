import "server-only";
import type { ProjectResponse } from "@thirdweb-dev/service-utils";
import { getAuthToken } from "@/api/auth-token";
import { NEXT_PUBLIC_THIRDWEB_API_HOST } from "@/constants/public-envs";

export type Project = ProjectResponse;

function sanitizeSlug(value: string, name: string): string {
  // Allow common slug characters and prevent path separators or control chars.
  // Adjust the allowed pattern if your valid slug format differs.
  const slugPattern = /^[A-Za-z0-9._-]+$/;
  if (!slugPattern.test(value)) {
    throw new Error(`Invalid ${name} value`);
  }
  return encodeURIComponent(value);
}

export async function getProjects(teamSlug: string) {
  const token = await getAuthToken();

  if (!token) {
    return [];
  }

  const safeTeamSlug = sanitizeSlug(teamSlug, "teamSlug");

  const teamsRes = await fetch(
    `${NEXT_PUBLIC_THIRDWEB_API_HOST}/v1/teams/${safeTeamSlug}/projects`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (teamsRes.ok) {
    return (await teamsRes.json())?.result as Project[];
  }
  return [];
}

export async function getProject(teamSlug: string, projectSlug: string) {
  const token = await getAuthToken();

  if (!token) {
    return null;
  }
  const safeTeamSlug = sanitizeSlug(teamSlug, "teamSlug");
  const safeProjectSlug = sanitizeSlug(projectSlug, "projectSlug");


  const teamsRes = await fetch(
    `${NEXT_PUBLIC_THIRDWEB_API_HOST}/v1/teams/${safeTeamSlug}/projects/${safeProjectSlug}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (teamsRes.ok) {
    return (await teamsRes.json())?.result as Project;
  }
  return null;
}
