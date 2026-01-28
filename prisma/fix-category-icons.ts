import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPABASE_URL = "https://gqzohavylekbxolokzgi.supabase.co";

// Маппинг slug -> имя файла в storage
const iconMapping: Record<string, string> = {
  "transport": "transport.png",
  "repair": "repair.png",
  "cleaning": "cleaning.png",
  "construction": "construction.png",
  "it-services": "it-services.png",
  "beauty": "beauty.png",
  "health": "health.png",
  "education": "education.png",
  "legal-finance": "legal-finance.png",
  "real-estate": "real-estate.png",
  "auto": "auto.png",
  "pets": "pets.png",
  "events": "events.png",
  "other": "other.png",
};

async function main() {
  // Только родительские категории (parent_id = null)
  const categories = await prisma.categories.findMany({
    where: { parent_id: null },
  });

  console.log("Updating parent category icons...\n");

  for (const cat of categories) {
    const iconFile = iconMapping[cat.slug];
    if (iconFile) {
      const newIconUrl = `${SUPABASE_URL}/storage/v1/object/public/categories/icons/${iconFile}`;

      await prisma.categories.update({
        where: { id: cat.id },
        data: { icon: newIconUrl },
      });

      console.log(`✅ ${cat.name}: ${newIconUrl}`);
    } else {
      console.log(`⚠️ No icon mapping for: ${cat.slug}`);
    }
  }

  console.log("\n✅ Done! Updated", categories.length, "parent categories");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
