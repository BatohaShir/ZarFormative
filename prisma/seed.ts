import { PrismaClient, AimagType, DistrictType } from "@prisma/client";

const prisma = new PrismaClient();

// Категории и подкатегории согласно ZAR-16
const categoriesData = [
  {
    slug: "transport",
    name: "Тээвэрлэлт, хүргэлт",
    icon: "/icons/categories/transport.svg",
    children: [
      { slug: "cargo-transport", name: "Ачаа тээвэр" },
      { slug: "moving", name: "Нүүлгэлт" },
      { slug: "delivery", name: "Хүргэлтийн үйлчилгээ" },
      { slug: "courier", name: "Шуудан, илгээмж" },
      { slug: "passenger-transport", name: "Зорчигч тээвэр" },
    ],
  },
  {
    slug: "repair",
    name: "Засвар, үйлчилгээ",
    icon: "/icons/categories/repair.svg",
    children: [
      { slug: "plumbing", name: "Сантехник" },
      { slug: "electrical", name: "Цахилгаан" },
      { slug: "appliance-repair", name: "Гэр ахуйн техник засвар" },
      { slug: "furniture-repair", name: "Тавилга засвар" },
      { slug: "phone-repair", name: "Утас, гар утас засвар" },
      { slug: "locksmith", name: "Түлхүүр, цоожны үйлчилгээ" },
    ],
  },
  {
    slug: "cleaning",
    name: "Цэвэрлэгээ",
    icon: "/icons/categories/cleaning.svg",
    children: [
      { slug: "home-cleaning", name: "Гэрийн цэвэрлэгээ" },
      { slug: "office-cleaning", name: "Оффисын цэвэрлэгээ" },
      { slug: "carpet-cleaning", name: "Хивс угаалга" },
      { slug: "window-cleaning", name: "Цонх цэвэрлэгээ" },
      { slug: "after-construction", name: "Барилгын дараах цэвэрлэгээ" },
    ],
  },
  {
    slug: "construction",
    name: "Барилга, засал чимэглэл",
    icon: "/icons/categories/construction.svg",
    children: [
      { slug: "interior-design", name: "Дотор засал" },
      { slug: "painting", name: "Будаг, ханын цаас" },
      { slug: "flooring", name: "Шал дэвсгэр" },
      { slug: "ceiling", name: "Таазны ажил" },
      { slug: "tiling", name: "Хавтан, плита" },
      { slug: "welding", name: "Гагнуур" },
      { slug: "carpentry", name: "Мужааны ажил" },
    ],
  },
  {
    slug: "it-services",
    name: "IT, Компьютер",
    icon: "/icons/categories/it-services.svg",
    children: [
      { slug: "computer-repair", name: "Компьютер засвар" },
      { slug: "web-development", name: "Веб хөгжүүлэлт" },
      { slug: "mobile-development", name: "Аппликейшн хөгжүүлэлт" },
      { slug: "network-setup", name: "Сүлжээ тохиргоо" },
      { slug: "data-recovery", name: "Өгөгдөл сэргээх" },
      { slug: "it-consulting", name: "IT зөвлөгөө" },
    ],
  },
  {
    slug: "beauty",
    name: "Гоо сайхан",
    icon: "/icons/categories/beauty.svg",
    children: [
      { slug: "hairdressing", name: "Үс засалт" },
      { slug: "makeup", name: "Нүүр будалт" },
      { slug: "manicure", name: "Маникюр, педикюр" },
      { slug: "massage", name: "Массаж" },
      { slug: "cosmetology", name: "Арьс арчилгаа" },
      { slug: "eyebrow", name: "Хөмсөг, сормуус" },
    ],
  },
  {
    slug: "health",
    name: "Эрүүл мэнд",
    icon: "/icons/categories/health.svg",
    children: [
      { slug: "doctor-home", name: "Гэрээр эмч" },
      { slug: "nursing", name: "Асаргаа сувилгаа" },
      { slug: "physiotherapy", name: "Физик эмчилгээ" },
      { slug: "psychology", name: "Сэтгэл зүйч" },
      { slug: "nutrition", name: "Хоол тэжээл зөвлөгөө" },
    ],
  },
  {
    slug: "education",
    name: "Боловсрол, сургалт",
    icon: "/icons/categories/education.svg",
    children: [
      { slug: "tutoring", name: "Хичээл заах" },
      { slug: "language", name: "Хэл сургалт" },
      { slug: "music-lessons", name: "Хөгжим заах" },
      { slug: "sports-training", name: "Спорт дасгалжуулалт" },
      { slug: "driving-lessons", name: "Жолоо сургалт" },
      { slug: "cooking-classes", name: "Хоол хийх сургалт" },
    ],
  },
  {
    slug: "legal-finance",
    name: "Хууль, санхүү",
    icon: "/icons/categories/legal-finance.svg",
    children: [
      { slug: "legal-consulting", name: "Хуулийн зөвлөгөө" },
      { slug: "accounting", name: "Нягтлан бодох" },
      { slug: "tax-consulting", name: "Татварын зөвлөгөө" },
      { slug: "notary", name: "Нотариат" },
      { slug: "translation", name: "Орчуулга, баталгаажуулалт" },
    ],
  },
  {
    slug: "real-estate",
    name: "Үл хөдлөх",
    icon: "/icons/categories/real-estate.svg",
    children: [
      { slug: "property-valuation", name: "Үнэлгээ" },
      { slug: "property-management", name: "Орон сууц удирдлага" },
      { slug: "rental-agent", name: "Түрээсийн зуучлал" },
      { slug: "property-consulting", name: "Үл хөдлөх зөвлөгөө" },
    ],
  },
  {
    slug: "auto",
    name: "Авто үйлчилгээ",
    icon: "/icons/categories/auto.svg",
    children: [
      { slug: "auto-repair", name: "Авто засвар" },
      { slug: "car-wash", name: "Авто угаалга" },
      { slug: "tire-service", name: "Дугуй үйлчилгээ" },
      { slug: "towing", name: "Чирэгч үйлчилгээ" },
      { slug: "car-detailing", name: "Авто тохижилт" },
      { slug: "auto-electric", name: "Авто цахилгаан" },
    ],
  },
  {
    slug: "pets",
    name: "Гэрийн тэжээвэр амьтан",
    icon: "/icons/categories/pets.svg",
    children: [
      { slug: "pet-grooming", name: "Амьтан гоёл засал" },
      { slug: "pet-sitting", name: "Амьтан харах" },
      { slug: "vet-services", name: "Мал эмнэлэг" },
      { slug: "pet-training", name: "Амьтан сургалт" },
      { slug: "pet-walking", name: "Нохой зугаалуулах" },
    ],
  },
  {
    slug: "events",
    name: "Арга хэмжээ, баяр ёслол",
    icon: "/icons/categories/events.svg",
    children: [
      { slug: "photography", name: "Гэрэл зураг" },
      { slug: "videography", name: "Видео бичлэг" },
      { slug: "event-hosting", name: "Хөтлөгч" },
      { slug: "catering", name: "Хоол үйлчилгээ" },
      { slug: "decoration", name: "Чимэглэл" },
      { slug: "entertainment", name: "Үзвэр, тоглоом" },
    ],
  },
  {
    slug: "other",
    name: "Бусад үйлчилгээ",
    icon: "/icons/categories/other.svg",
    children: [
      { slug: "personal-assistant", name: "Хувийн туслах" },
      { slug: "errand-service", name: "Ажил хэрэг гүйцэтгэх" },
      { slug: "handyman", name: "Гар ажил" },
      { slug: "custom-service", name: "Захиалгат үйлчилгээ" },
    ],
  },
];

async function seedCategories() {
  console.log("📁 Seeding categories...");

  let sortOrder = 0;
  for (const category of categoriesData) {
    // Создаём родительскую категорию
    const parent = await prisma.categories.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        sort_order: sortOrder,
      },
      create: {
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        sort_order: sortOrder,
        is_active: true,
      },
    });
    console.log(`  ✅ ${parent.name}`);

    // Создаём дочерние категории
    let childSortOrder = 0;
    for (const child of category.children) {
      await prisma.categories.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          parent_id: parent.id,
          sort_order: childSortOrder,
        },
        create: {
          slug: child.slug,
          name: child.name,
          parent_id: parent.id,
          sort_order: childSortOrder,
          is_active: true,
        },
      });
      childSortOrder++;
    }
    console.log(`     └─ ${category.children.length} подкатегорий`);
    sortOrder++;
  }

  const totalCategories = await prisma.categories.count();
  console.log(`\n📊 Всего категорий: ${totalCategories}`);
}

// Бүх 21 аймаг + Улаанбаатар (ZAR-16-ийн дагуу)
const aimagsData: { code: string; name: string; name_en: string; type: AimagType }[] = [
  { code: "UB", name: "Улаанбаатар", name_en: "Ulaanbaatar", type: "capital" },
  { code: "AR", name: "Архангай", name_en: "Arkhangai", type: "aimag" },
  { code: "BO", name: "Баян-Өлгий", name_en: "Bayan-Olgii", type: "aimag" },
  { code: "BH", name: "Баянхонгор", name_en: "Bayankhongor", type: "aimag" },
  { code: "BU", name: "Булган", name_en: "Bulgan", type: "aimag" },
  { code: "GA", name: "Говь-Алтай", name_en: "Govi-Altai", type: "aimag" },
  { code: "GS", name: "Говьсүмбэр", name_en: "Govisumber", type: "aimag" },
  { code: "DU", name: "Дархан-Уул", name_en: "Darkhan-Uul", type: "aimag" },
  { code: "DG", name: "Дорноговь", name_en: "Dornogovi", type: "aimag" },
  { code: "DO", name: "Дорнод", name_en: "Dornod", type: "aimag" },
  { code: "DD", name: "Дундговь", name_en: "Dundgovi", type: "aimag" },
  { code: "ZA", name: "Завхан", name_en: "Zavkhan", type: "aimag" },
  { code: "OR", name: "Орхон", name_en: "Orkhon", type: "aimag" },
  { code: "OH", name: "Өвөрхангай", name_en: "Ovorkhangai", type: "aimag" },
  { code: "OG", name: "Өмнөговь", name_en: "Omnogovi", type: "aimag" },
  { code: "SB", name: "Сүхбаатар", name_en: "Sukhbaatar", type: "aimag" },
  { code: "SE", name: "Сэлэнгэ", name_en: "Selenge", type: "aimag" },
  { code: "TO", name: "Төв", name_en: "Tov", type: "aimag" },
  { code: "UV", name: "Увс", name_en: "Uvs", type: "aimag" },
  { code: "HO", name: "Ховд", name_en: "Khovd", type: "aimag" },
  { code: "HU", name: "Хөвсгөл", name_en: "Khovsgol", type: "aimag" },
  { code: "HE", name: "Хэнтий", name_en: "Khentii", type: "aimag" },
];

// Улаанбаатар хотын 9 дүүрэг
const ulaanbaatarDistricts: { name: string; name_en: string; type: DistrictType }[] = [
  { name: "Багануур дүүрэг", name_en: "Baganuur", type: "duureg" },
  { name: "Багахангай дүүрэг", name_en: "Bagakhangai", type: "duureg" },
  { name: "Баянгол дүүрэг", name_en: "Bayangol", type: "duureg" },
  { name: "Баянзүрх дүүрэг", name_en: "Bayanzurkh", type: "duureg" },
  { name: "Налайх дүүрэг", name_en: "Nalaikh", type: "duureg" },
  { name: "Сонгинохайрхан дүүрэг", name_en: "Songinokhairkhan", type: "duureg" },
  { name: "Сүхбаатар дүүрэг", name_en: "Sukhbaatar", type: "duureg" },
  { name: "Хан-Уул дүүрэг", name_en: "Khan-Uul", type: "duureg" },
  { name: "Чингэлтэй дүүрэг", name_en: "Chingeltei", type: "duureg" },
];

async function seedLocations() {
  console.log("📍 Seeding locations...\n");

  // Бүх аймгуудыг үүсгэх
  console.log("  🏔️ Аймгууд:");
  const createdAimags: Record<string, { id: string; name: string }> = {};

  for (let i = 0; i < aimagsData.length; i++) {
    const aimag = aimagsData[i];
    const created = await prisma.aimags.upsert({
      where: { code: aimag.code },
      update: {
        name: aimag.name,
        name_en: aimag.name_en,
        type: aimag.type,
        sort_order: i,
      },
      create: {
        code: aimag.code,
        name: aimag.name,
        name_en: aimag.name_en,
        type: aimag.type,
        sort_order: i,
        is_active: true,
      },
    });
    createdAimags[aimag.code] = { id: created.id, name: created.name };
    console.log(`     ✅ ${created.name}`);
  }
  console.log(`  📊 Нийт аймаг: ${Object.keys(createdAimags).length}\n`);

  // Улаанбаатарын дүүргүүдийг үүсгэх
  console.log("  🏙️ Улаанбаатар дүүргүүд:");
  const ubAimag = createdAimags["UB"];
  const createdDistricts: Record<string, { id: string; name: string }> = {};

  for (let i = 0; i < ulaanbaatarDistricts.length; i++) {
    const district = ulaanbaatarDistricts[i];
    const created = await prisma.districts.upsert({
      where: { aimag_id_name: { aimag_id: ubAimag.id, name: district.name } },
      update: {
        name_en: district.name_en,
        type: district.type,
        sort_order: i,
      },
      create: {
        aimag_id: ubAimag.id,
        name: district.name,
        name_en: district.name_en,
        type: district.type,
        sort_order: i,
        is_active: true,
      },
    });
    createdDistricts[district.name] = { id: created.id, name: created.name };
    console.log(`     ✅ ${created.name} дүүрэг`);
  }
  console.log(`  📊 Нийт дүүрэг: ${Object.keys(createdDistricts).length}\n`);

  // Дүүрэг бүрт хороо үүсгэх (жишээ болгон 1-20 хороо)
  console.log("  🏘️ Хороонууд:");
  const khorooCountByDistrict: Record<string, number> = {
    "Багануур дүүрэг": 5,
    "Багахангай дүүрэг": 3,
    "Баянгол дүүрэг": 23,
    "Баянзүрх дүүрэг": 28,
    "Налайх дүүрэг": 7,
    "Сонгинохайрхан дүүрэг": 32,
    "Сүхбаатар дүүрэг": 20,
    "Хан-Уул дүүрэг": 16,
    "Чингэлтэй дүүрэг": 19,
  };

  let totalKhoroos = 0;
  for (const [districtName, district] of Object.entries(createdDistricts)) {
    const khorooCount = khorooCountByDistrict[districtName] || 10;
    for (let i = 1; i <= khorooCount; i++) {
      await prisma.khoroos.upsert({
        where: { district_id_number: { district_id: district.id, number: i } },
        update: {},
        create: {
          district_id: district.id,
          name: `${i}-р хороо`,
          number: i,
          sort_order: i - 1,
          is_active: true,
        },
      });
    }
    totalKhoroos += khorooCount;
    console.log(`     ✅ ${districtName}: ${khorooCount} хороо`);
  }
  console.log(`  📊 Нийт хороо: ${totalKhoroos}\n`);

  return { createdAimags, createdDistricts };
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // Сначала добавляем категории
  await seedCategories();
  console.log("");

  // Добавляем локации (аймаги, дүүрэги, хороо)
  const { createdAimags, createdDistricts } = await seedLocations();

  // Для совместимости с остальным кодом
  const ulaanbaatar = { id: createdAimags["UB"].id, name: createdAimags["UB"].name };
  const bayangol = { id: createdDistricts["Баянгол дүүрэг"].id, name: createdDistricts["Баянгол дүүрэг"].name };
  const sukhbaatar = { id: createdDistricts["Сүхбаатар дүүрэг"].id, name: createdDistricts["Сүхбаатар дүүрэг"].name };
  const khanUul = { id: createdDistricts["Хан-Уул дүүрэг"].id, name: createdDistricts["Хан-Уул дүүрэг"].name };

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
