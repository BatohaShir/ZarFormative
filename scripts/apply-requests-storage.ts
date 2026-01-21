import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually
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
  console.error("Missing environment variables:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING");
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "OK" : "MISSING");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupRequestsStorage() {
  console.log("🔍 Checking requests bucket...\n");

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error("Error listing buckets:", bucketsError.message);
    return;
  }

  const requestsBucket = buckets?.find(b => b.id === "requests");

  if (!requestsBucket) {
    console.log("📦 Creating requests bucket...");
    const { error: createError } = await supabase.storage.createBucket("requests", {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });

    if (createError) {
      console.error("Error creating bucket:", createError.message);
      return;
    }
    console.log("✅ Bucket created successfully!");
  } else {
    console.log("✅ Requests bucket exists");
    console.log("   Public:", requestsBucket.public);
  }

  // Test upload with service role
  console.log("\n🧪 Testing upload...");

  const testContent = new Blob(["test"], { type: "text/plain" });
  const { error: uploadError } = await supabase.storage
    .from("requests")
    .upload("_test.txt", testContent, { upsert: true });

  if (uploadError) {
    console.error("❌ Upload test failed:", uploadError.message);
  } else {
    console.log("✅ Upload test passed");

    // Clean up
    await supabase.storage.from("requests").remove(["_test.txt"]);
  }

  console.log("\n📋 Storage policies need to be applied via Supabase Dashboard or SQL:");
  console.log("   Go to: Storage > Policies > requests bucket");
  console.log("   Or run this SQL in Supabase SQL Editor:\n");

  const sql = `
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view request images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload request images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own request images" ON storage.objects;

-- Allow anyone to read request images (public bucket)
CREATE POLICY "Anyone can view request images"
ON storage.objects FOR SELECT
USING (bucket_id = 'requests');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload request images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'requests'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own request images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'requests'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
`;

  console.log(sql);
}

setupRequestsStorage()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
