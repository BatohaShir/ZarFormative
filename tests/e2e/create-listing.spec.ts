import { test, expect } from "@playwright/test";

test.describe("Create Listing Page", () => {
  test("should show login prompt when not authenticated", async ({ page }) => {
    await page.goto("/services/create");

    // Должна показаться карточка с предложением войти
    await expect(
      page.getByText("Необходимо войти в систему для создания объявления")
    ).toBeVisible();

    // Должна быть кнопка "Войти"
    await expect(page.getByRole("button", { name: /войти/i })).toBeVisible();
  });

  test("should display create form when authenticated", async ({
    page,
    context,
  }) => {
    // TODO: Добавить авторизацию через Supabase
    // Пропускаем этот тест пока нет автоматической авторизации
    test.skip();

    await page.goto("/services/create");

    // Проверяем наличие полей формы
    await expect(page.getByLabel(/заголовок/i)).toBeVisible();
    await expect(page.getByLabel(/категория/i)).toBeVisible();
    await expect(page.getByLabel(/описание/i)).toBeVisible();
    await expect(page.getByLabel(/город/i)).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    test.skip(); // Требуется авторизация

    await page.goto("/services/create");

    // Пробуем отправить форму без заполнения
    await page.getByRole("button", { name: /создать объявление/i }).click();

    // Должны появиться ошибки валидации
    await expect(page.getByText(/минимум 5 символов/i)).toBeVisible();
    await expect(page.getByText(/выберите категорию/i)).toBeVisible();
  });

  test("should allow image upload via drag-and-drop", async ({ page }) => {
    test.skip(); // Требуется авторизация

    await page.goto("/services/create");

    // Проверяем наличие зоны загрузки
    await expect(
      page.getByText(/перетащите фото или нажмите для загрузки/i)
    ).toBeVisible();

    // Проверяем лимит
    await expect(page.getByText(/макс\. 3 фото/i)).toBeVisible();
  });
});
