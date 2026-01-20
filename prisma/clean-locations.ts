import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Правильные аймаги (21 аймаг + Улаанбаатар)
const validAimags = [
  { code: "UB", name: "Улаанбаатар", name_en: "Ulaanbaatar", type: "capital" as const },
  { code: "AR", name: "Архангай", name_en: "Arkhangai", type: "aimag" as const },
  { code: "BO", name: "Баян-Өлгий", name_en: "Bayan-Olgii", type: "aimag" as const },
  { code: "BH", name: "Баянхонгор", name_en: "Bayankhongor", type: "aimag" as const },
  { code: "BU", name: "Булган", name_en: "Bulgan", type: "aimag" as const },
  { code: "GA", name: "Говь-Алтай", name_en: "Govi-Altai", type: "aimag" as const },
  { code: "GS", name: "Говьсүмбэр", name_en: "Govisumber", type: "aimag" as const },
  { code: "DU", name: "Дархан-Уул", name_en: "Darkhan-Uul", type: "aimag" as const },
  { code: "DG", name: "Дорноговь", name_en: "Dornogovi", type: "aimag" as const },
  { code: "DO", name: "Дорнод", name_en: "Dornod", type: "aimag" as const },
  { code: "DD", name: "Дундговь", name_en: "Dundgovi", type: "aimag" as const },
  { code: "ZA", name: "Завхан", name_en: "Zavkhan", type: "aimag" as const },
  { code: "OR", name: "Орхон", name_en: "Orkhon", type: "aimag" as const },
  { code: "OH", name: "Өвөрхангай", name_en: "Ovorkhangai", type: "aimag" as const },
  { code: "OG", name: "Өмнөговь", name_en: "Omnogovi", type: "aimag" as const },
  { code: "SB", name: "Сүхбаатар", name_en: "Sukhbaatar", type: "aimag" as const },
  { code: "SE", name: "Сэлэнгэ", name_en: "Selenge", type: "aimag" as const },
  { code: "TO", name: "Төв", name_en: "Tov", type: "aimag" as const },
  { code: "UV", name: "Увс", name_en: "Uvs", type: "aimag" as const },
  { code: "HO", name: "Ховд", name_en: "Khovd", type: "aimag" as const },
  { code: "HU", name: "Хөвсгөл", name_en: "Khovsgol", type: "aimag" as const },
  { code: "HE", name: "Хэнтий", name_en: "Khentii", type: "aimag" as const },
];

// Правильные дүүрги Улаанбаатара (9 дүүрэг)
const validDistricts = [
  { name: "Багануур дүүрэг", name_en: "Baganuur", type: "duureg" as const, khorooCount: 5 },
  { name: "Багахангай дүүрэг", name_en: "Bagakhangai", type: "duureg" as const, khorooCount: 3 },
  { name: "Баянгол дүүрэг", name_en: "Bayangol", type: "duureg" as const, khorooCount: 23 },
  { name: "Баянзүрх дүүрэг", name_en: "Bayanzurkh", type: "duureg" as const, khorooCount: 28 },
  { name: "Налайх дүүрэг", name_en: "Nalaikh", type: "duureg" as const, khorooCount: 7 },
  { name: "Сонгинохайрхан дүүрэг", name_en: "Songinokhairkhan", type: "duureg" as const, khorooCount: 32 },
  { name: "Сүхбаатар дүүрэг", name_en: "Sukhbaatar", type: "duureg" as const, khorooCount: 20 },
  { name: "Хан-Уул дүүрэг", name_en: "Khan-Uul", type: "duureg" as const, khorooCount: 16 },
  { name: "Чингэлтэй дүүрэг", name_en: "Chingeltei", type: "duureg" as const, khorooCount: 19 },
];

async function cleanAndSeedLocations() {
  console.log("🧹 Очистка и пересоздание локаций...\n");

  // 1. Удаляем все khoroos
  const deletedKhoroos = await prisma.khoroos.deleteMany({});
  console.log(`❌ Удалено хороо: ${deletedKhoroos.count}`);

  // 2. Удаляем все districts
  const deletedDistricts = await prisma.districts.deleteMany({});
  console.log(`❌ Удалено дүүрэг/сумов: ${deletedDistricts.count}`);

  // 3. Удаляем все aimags
  const deletedAimags = await prisma.aimags.deleteMany({});
  console.log(`❌ Удалено аймагов: ${deletedAimags.count}`);

  console.log("\n✅ Создание правильных локаций...\n");

  // 4. Создаём аймаги
  console.log("🏔️ Аймаги:");
  const createdAimags: Record<string, string> = {};

  for (let i = 0; i < validAimags.length; i++) {
    const aimag = validAimags[i];
    const created = await prisma.aimags.create({
      data: {
        code: aimag.code,
        name: aimag.name,
        name_en: aimag.name_en,
        type: aimag.type,
        sort_order: i,
        is_active: true,
      },
    });
    createdAimags[aimag.code] = created.id;
    console.log(`   ✅ ${created.name}`);
  }

  // 5. Создаём дүүрги для Улаанбаатара
  console.log("\n🏙️ Улаанбаатар дүүргүүд:");
  const ubId = createdAimags["UB"];

  for (let i = 0; i < validDistricts.length; i++) {
    const district = validDistricts[i];
    const created = await prisma.districts.create({
      data: {
        aimag_id: ubId,
        name: district.name,
        name_en: district.name_en,
        type: district.type,
        sort_order: i,
        is_active: true,
      },
    });
    console.log(`   ✅ ${created.name}`);

    // Создаём хороо для дүүрэга
    for (let k = 1; k <= district.khorooCount; k++) {
      await prisma.khoroos.create({
        data: {
          district_id: created.id,
          name: `${k}-р хороо`,
          number: k,
          sort_order: k - 1,
          is_active: true,
        },
      });
    }
    console.log(`      └─ ${district.khorooCount} хороо`);
  }

  // Подсчёт
  const totalAimags = await prisma.aimags.count();
  const totalDistricts = await prisma.districts.count();
  const totalKhoroos = await prisma.khoroos.count();

  console.log("\n📊 Итого:");
  console.log(`   Аймагов: ${totalAimags} (включая Улаанбаатар)`);
  console.log(`   Дүүргов: ${totalDistricts}`);
  console.log(`   Хороо: ${totalKhoroos}`);
  console.log("\n🎉 Готово!");
}

cleanAndSeedLocations()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
