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

async function checkAndFixStoragePolicies() {
  console.log("🔍 Checking categories bucket...\n");

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error("Error listing buckets:", bucketsError.message);
    return;
  }

  const categoriesBucket = buckets?.find(b => b.id === "categories");

  if (!categoriesBucket) {
    console.log("📦 Creating categories bucket...");
    const { error: createError } = await supabase.storage.createBucket("categories", {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
    });

    if (createError) {
      console.error("Error creating bucket:", createError.message);
      return;
    }
    console.log("✅ Bucket created successfully!");
  } else {
    console.log("✅ Categories bucket exists");
    console.log("   Public:", categoriesBucket.public);
  }

  // Test upload with service role
  console.log("\n🧪 Testing upload...");

  const testContent = new Blob(["test"], { type: "text/plain" });
  const { error: uploadError } = await supabase.storage
    .from("categories")
    .upload("_test.txt", testContent, { upsert: true });

  if (uploadError) {
    console.error("❌ Upload test failed:", uploadError.message);
  } else {
    console.log("✅ Upload test passed");

    // Clean up
    await supabase.storage.from("categories").remove(["_test.txt"]);
  }

  console.log("\n📋 Storage policies need to be applied via Supabase Dashboard or SQL:");
  console.log("   Go to: Storage > Policies > categories bucket");
  console.log("   Or run this SQL in Supabase SQL Editor:\n");

  const sql = `
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view category icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload category icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update category icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete category icons" ON storage.objects;
DROP POLICY IF EXISTS "Admin and manager can upload category icons" ON storage.objects;
DROP POLICY IF EXISTS "Admin and manager can update category icons" ON storage.objects;
DROP POLICY IF EXISTS "Admin and manager can delete category icons" ON storage.objects;

-- Allow anyone to read category icons (public bucket)
CREATE POLICY "Anyone can view category icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'categories');

-- Allow admin/manager to upload category icons
CREATE POLICY "Admin and manager can upload category icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Allow admin/manager to update category icons
CREATE POLICY "Admin and manager can update category icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Allow admin/manager to delete category icons
CREATE POLICY "Admin and manager can delete category icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'categories'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);
`;

  console.log(sql);
}

checkAndFixStoragePolicies()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
