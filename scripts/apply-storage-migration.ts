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

async function createCategoriesBucket() {
  console.log("Creating categories bucket...");

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError.message);
    return false;
  }

  const bucketExists = buckets?.some((b) => b.id === "categories");

  if (bucketExists) {
    console.log("Bucket 'categories' already exists. Updating settings...");

    const { error: updateError } = await supabase.storage.updateBucket("categories", {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
    });

    if (updateError) {
      console.error("Error updating bucket:", updateError.message);
      return false;
    }

    console.log("Bucket updated successfully!");
  } else {
    const { error: createError } = await supabase.storage.createBucket("categories", {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
    });

    if (createError) {
      console.error("Error creating bucket:", createError.message);
      return false;
    }

    console.log("Bucket 'categories' created successfully!");
  }

  // Create folder structure by uploading placeholder files
  console.log("\nCreating folder structure...");

  const placeholderContent = new Blob(["placeholder"], { type: "text/plain" });

  // Create icons folder
  const { error: iconsError } = await supabase.storage
    .from("categories")
    .upload("icons/.gitkeep", placeholderContent, { upsert: true });

  if (iconsError && !iconsError.message.includes("already exists")) {
    console.warn("Warning creating icons folder:", iconsError.message);
  } else {
    console.log("  ✓ icons/ folder created");
  }

  // Create subcategories folder
  const { error: subcatError } = await supabase.storage
    .from("categories")
    .upload("subcategories/.gitkeep", placeholderContent, { upsert: true });

  if (subcatError && !subcatError.message.includes("already exists")) {
    console.warn("Warning creating subcategories folder:", subcatError.message);
  } else {
    console.log("  ✓ subcategories/ folder created");
  }

  return true;
}

async function main() {
  console.log("=".repeat(50));
  console.log("Applying Categories Storage Migration");
  console.log("=".repeat(50));
  console.log("");

  const success = await createCategoriesBucket();

  console.log("");
  console.log("=".repeat(50));

  if (success) {
    console.log("Migration completed successfully!");
    console.log("");
    console.log("Bucket structure:");
    console.log("  categories/");
    console.log("  ├── icons/           # Category icons");
    console.log("  └── subcategories/   # Subcategory icons");
  } else {
    console.log("Migration failed!");
    process.exit(1);
  }
}

main();
