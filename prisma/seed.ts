import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Создаём аймаги
  const ulaanbaatar = await prisma.aimags.upsert({
    where: { code: "UB" },
    update: {},
    create: {
      name: "Улаанбаатар",
      name_en: "Ulaanbaatar",
      code: "UB",
      type: "capital",
      sort_order: 0,
      is_active: true,
    },
  });
  console.log("✅ Created aimag:", ulaanbaatar.name);

  const darkhan = await prisma.aimags.upsert({
    where: { code: "DU" },
    update: {},
    create: {
      name: "Дархан-Уул",
      name_en: "Darkhan-Uul",
      code: "DU",
      type: "aimag",
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("✅ Created aimag:", darkhan.name);

  const orkhon = await prisma.aimags.upsert({
    where: { code: "OR" },
    update: {},
    create: {
      name: "Орхон",
      name_en: "Orkhon",
      code: "OR",
      type: "aimag",
      sort_order: 2,
      is_active: true,
    },
  });
  console.log("✅ Created aimag:", orkhon.name);

  // Создаём дүүрэги для Улаанбаатара
  const bayangol = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Баянгол" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Баянгол",
      name_en: "Bayangol",
      type: "duureg",
      sort_order: 0,
      is_active: true,
    },
  });
  console.log("✅ Created district:", bayangol.name);

  const sukhbaatar = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Сүхбаатар" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Сүхбаатар",
      name_en: "Sukhbaatar",
      type: "duureg",
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("✅ Created district:", sukhbaatar.name);

  const khanUul = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Хан-Уул" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Хан-Уул",
      name_en: "Khan-Uul",
      type: "duureg",
      sort_order: 2,
      is_active: true,
    },
  });
  console.log("✅ Created district:", khanUul.name);

  const bayanzurkh = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Баянзүрх" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Баянзүрх",
      name_en: "Bayanzurkh",
      type: "duureg",
      sort_order: 3,
      is_active: true,
    },
  });
  console.log("✅ Created district:", bayanzurkh.name);

  const chingeltei = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Чингэлтэй" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Чингэлтэй",
      name_en: "Chingeltei",
      type: "duureg",
      sort_order: 4,
      is_active: true,
    },
  });
  console.log("✅ Created district:", chingeltei.name);

  const songinokhairkhan = await prisma.districts.upsert({
    where: { aimag_id_name: { aimag_id: ulaanbaatar.id, name: "Сонгинохайрхан" } },
    update: {},
    create: {
      aimag_id: ulaanbaatar.id,
      name: "Сонгинохайрхан",
      name_en: "Songinokhairkhan",
      type: "duureg",
      sort_order: 5,
      is_active: true,
    },
  });
  console.log("✅ Created district:", songinokhairkhan.name);

  // Создаём хороо для Баянгол дүүрэг
  for (let i = 1; i <= 5; i++) {
    await prisma.khoroos.upsert({
      where: { district_id_number: { district_id: bayangol.id, number: i } },
      update: {},
      create: {
        district_id: bayangol.id,
        name: `${i}-р хороо`,
        number: i,
        sort_order: i - 1,
        is_active: true,
      },
    });
  }
  console.log("✅ Created 5 khoroos for Баянгол");

  // Создаём хороо для Сүхбаатар дүүрэг
  for (let i = 1; i <= 5; i++) {
    await prisma.khoroos.upsert({
      where: { district_id_number: { district_id: sukhbaatar.id, number: i } },
      update: {},
      create: {
        district_id: sukhbaatar.id,
        name: `${i}-р хороо`,
        number: i,
        sort_order: i - 1,
        is_active: true,
      },
    });
  }
  console.log("✅ Created 5 khoroos for Сүхбаатар");

  // Получаем первую категорию
  const category = await prisma.categories.findFirst({
    where: { is_active: true },
  });

  if (!category) {
    console.log("⚠️ No categories found, skipping listings");
    return;
  }

  // Получаем первого пользователя (admin)
  const user = await prisma.profiles.findFirst({
    where: { role: "admin" },
  });

  if (!user) {
    console.log("⚠️ No admin user found, skipping listings");
    return;
  }

  // Создаём тестовые объявления
  const listing1 = await prisma.listings.upsert({
    where: { slug: "test-service-1" },
    update: {},
    create: {
      user_id: user.id,
      category_id: category.id,
      title: "Гэр хөдөлгөөний үйлчилгээ",
      slug: "test-service-1",
      description: "Мэргэжлийн баг гэр хөдөлгөөний үйлчилгээг хариуцлагатай, хурдан шуурхай гүйцэтгэнэ. 24/7 ажиллана.",
      price: 150000,
      currency: "MNT",
      is_negotiable: false,
      aimag_id: ulaanbaatar.id,
      district_id: bayangol.id,
      status: "active",
      is_active: true,
      views_count: 125,
      published_at: new Date(),
    },
  });
  console.log("✅ Created listing:", listing1.title);

  const listing2 = await prisma.listings.upsert({
    where: { slug: "test-service-2" },
    update: {},
    create: {
      user_id: user.id,
      category_id: category.id,
      title: "Цахилгааны засвар үйлчилгээ",
      slug: "test-service-2",
      description: "Бүх төрлийн цахилгааны ажил хийнэ. Шугам татах, розетка суурилуулах, гэрэлтүүлэг.",
      price: 50000,
      currency: "MNT",
      is_negotiable: true,
      aimag_id: ulaanbaatar.id,
      district_id: sukhbaatar.id,
      status: "active",
      is_active: true,
      views_count: 89,
      published_at: new Date(),
    },
  });
  console.log("✅ Created listing:", listing2.title);

  const listing3 = await prisma.listings.upsert({
    where: { slug: "test-service-3" },
    update: {},
    create: {
      user_id: user.id,
      category_id: category.id,
      title: "Сантехникийн засвар",
      slug: "test-service-3",
      description: "Усны хоолой засварлах, угаалтуур, жорлон суурилуулах, халаалтын систем засах.",
      price: 80000,
      currency: "MNT",
      is_negotiable: false,
      aimag_id: ulaanbaatar.id,
      district_id: khanUul.id,
      status: "active",
      is_active: true,
      views_count: 234,
      published_at: new Date(),
    },
  });
  console.log("✅ Created listing:", listing3.title);

  // Добавляем изображения к объявлениям
  await prisma.listings_images.createMany({
    data: [
      {
        listing_id: listing1.id,
        url: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=600&fit=crop",
        alt: "Гэр хөдөлгөөн",
        sort_order: 0,
        is_cover: true,
      },
      {
        listing_id: listing2.id,
        url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop",
        alt: "Цахилгааны засвар",
        sort_order: 0,
        is_cover: true,
      },
      {
        listing_id: listing3.id,
        url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop",
        alt: "Сантехник",
        sort_order: 0,
        is_cover: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created images for listings");

  console.log("\n🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
