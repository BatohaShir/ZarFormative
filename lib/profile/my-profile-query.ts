/**
 * Shared $queryRaw for /account/me.
 *
 * The page previously booted as a pure client component — it waited on
 * useAuth (one supabase round-trip for session, another for the
 * ZenStack findUnique), then a separate findMany for educations, then
 * another for work experiences. On the MN→Seoul link that's ~6s of
 * skeleton even with localStorage-cached profile.
 *
 * Here we collapse the three queries into one CTE that returns
 * everything the page needs. Result shapes mirror the client types
 * (Profile, Education, WorkExperience) so the server payload can be
 * fed to React Query as initialData and the client never refetches on
 * mount.
 *
 * Educations / work are skipped for company accounts — they aren't
 * shown on the page.
 */
import { prisma } from "@/lib/prisma";

export interface MyProfileSsrData {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    is_company: boolean;
    avatar_url: string | null;
    about: string | null;
    company_name: string | null;
    registration_number: string | null;
    is_deleted: boolean;
    preferred_language: string;
    avg_rating: number | null;
    reviews_count: number;
    completed_jobs_count: number;
  } | null;
  educations: {
    id: string;
    user_id: string;
    degree: string;
    institution: string;
    field_of_study: string | null;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
  }[];
  workExperiences: {
    id: string;
    user_id: string;
    company: string;
    position: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
  }[];
}

interface RawRow {
  profile: MyProfileSsrData["profile"];
  educations: MyProfileSsrData["educations"] | null;
  work_experiences: MyProfileSsrData["workExperiences"] | null;
}

export async function fetchMyProfileData(userId: string): Promise<MyProfileSsrData> {
  try {
    const rows = await prisma.$queryRaw<RawRow[]>`
      WITH p AS (
        SELECT
          id, first_name, last_name, phone_number, is_company,
          avatar_url, about, company_name, registration_number,
          is_deleted, preferred_language,
          avg_rating, reviews_count, completed_jobs_count
        FROM profiles
        WHERE id = ${userId}::uuid
        LIMIT 1
      ),
      edu AS (
        SELECT jsonb_agg(row ORDER BY start_date DESC) AS data FROM (
          SELECT
            id, user_id, degree, institution, field_of_study,
            start_date, end_date, is_current
          FROM profiles_educations
          WHERE user_id = ${userId}::uuid
            AND (SELECT is_company FROM p) = false
          ORDER BY start_date DESC
        ) row
      ),
      work AS (
        SELECT jsonb_agg(row ORDER BY start_date DESC) AS data FROM (
          SELECT
            id, user_id, company, position, description,
            start_date, end_date, is_current
          FROM profiles_work_experiences
          WHERE user_id = ${userId}::uuid
            AND (SELECT is_company FROM p) = false
          ORDER BY start_date DESC
        ) row
      )
      SELECT
        (SELECT to_jsonb(p.*) FROM p) AS profile,
        COALESCE(edu.data, '[]'::jsonb) AS educations,
        COALESCE(work.data, '[]'::jsonb) AS work_experiences
      FROM edu, work
    `;

    const row = rows[0];
    if (!row || !row.profile) {
      return { profile: null, educations: [], workExperiences: [] };
    }

    return {
      profile: {
        ...row.profile,
        avg_rating: row.profile.avg_rating != null ? Number(row.profile.avg_rating) : null,
      },
      educations: row.educations ?? [],
      workExperiences: row.work_experiences ?? [],
    };
  } catch (error) {
    console.error("fetchMyProfileData failed:", error);
    return { profile: null, educations: [], workExperiences: [] };
  }
}
