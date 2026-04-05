import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Applying ad-stories storage RLS policies...\n");

  const sql = `
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view ad story images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload ad story images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own ad story images" ON storage.objects;

    -- Anyone can view story images (public)
    CREATE POLICY "Anyone can view ad story images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ad-stories');

    -- Authenticated users can upload to their own folder
    CREATE POLICY "Users can upload ad story images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'ad-stories'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Users can delete their own story images
    CREATE POLICY "Users can delete own ad story images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'ad-stories'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `;

  const { error } = await supabase.rpc("exec_sql", { sql_query: sql }).single();

  if (error) {
    // rpc may not exist, try raw REST
    console.log("rpc not available, trying direct SQL via postgrest...");

    // Use the Supabase Management API or just print the SQL
    console.log("Please run this SQL in Supabase Dashboard > SQL Editor:\n");
    console.log(sql);
    console.log("\nOr apply via: supabase db execute");
    return;
  }

  console.log("✅ RLS policies applied successfully!");
}

main().catch(console.error);
