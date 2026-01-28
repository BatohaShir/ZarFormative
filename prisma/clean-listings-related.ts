import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanListingsRelatedData() {
  console.log("🧹 Очистка данных связанных с объявлениями...\n");
  console.log("⚠️  НЕ удаляем: listings, listings_views\n");

  // Порядок удаления важен из-за foreign keys
  // Начинаем с самых зависимых таблиц

  // 1. request_locations (зависит от listing_requests)
  const deletedRequestLocations = await prisma.request_locations.deleteMany({});
  console.log(`❌ Удалено request_locations: ${deletedRequestLocations.count}`);

  // 2. chat_messages (зависит от listing_requests)
  const deletedChatMessages = await prisma.chat_messages.deleteMany({});
  console.log(`❌ Удалено chat_messages: ${deletedChatMessages.count}`);

  // 3. reviews (зависит от listing_requests)
  const deletedReviews = await prisma.reviews.deleteMany({});
  console.log(`❌ Удалено reviews: ${deletedReviews.count}`);

  // 4. notifications (зависит от listing_requests)
  const deletedNotifications = await prisma.notifications.deleteMany({});
  console.log(`❌ Удалено notifications: ${deletedNotifications.count}`);

  // 5. listing_requests (зависит от listings)
  const deletedListingRequests = await prisma.listing_requests.deleteMany({});
  console.log(`❌ Удалено listing_requests: ${deletedListingRequests.count}`);

  // 6. user_favorites (зависит от listings)
  const deletedFavorites = await prisma.user_favorites.deleteMany({});
  console.log(`❌ Удалено user_favorites: ${deletedFavorites.count}`);

  // 7. listings_images (зависит от listings)
  const deletedImages = await prisma.listings_images.deleteMany({});
  console.log(`❌ Удалено listings_images: ${deletedImages.count}`);

  console.log("\n✅ Очистка завершена!");
  console.log("\n📊 Оставлено без изменений:");

  const listingsCount = await prisma.listings.count();
  const viewsCount = await prisma.listings_views.count();

  console.log(`   listings: ${listingsCount}`);
  console.log(`   listings_views: ${viewsCount}`);
}

cleanListingsRelatedData()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
