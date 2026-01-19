# MCP Playwright Setup

Model Context Protocol (MCP) интеграция с Playwright для автоматизированного тестирования.

## Установка

Playwright уже установлен и настроен. Браузеры загружены автоматически.

## Конфигурация

### 1. Claude Desktop Config

Конфигурация находится в: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"],
      "env": {
        "PLAYWRIGHT_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Playwright Config

Конфигурация находится в: `playwright.config.ts`

- Тесты в директории: `tests/e2e/`
- Автоматический запуск dev сервера перед тестами
- Скриншоты при ошибках
- HTML отчеты

## Использование

### Запуск тестов

```bash
# Запустить все E2E тесты
npm run test:e2e

# Запустить с UI (интерактивный режим)
npm run test:e2e:ui

# Запустить в режиме отладки
npm run test:e2e:debug

# Показать отчет после запуска
npm run test:e2e:report
```

### Написание тестов

Пример теста находится в `tests/e2e/create-listing.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Create Listing Page", () => {
  test("should show login prompt when not authenticated", async ({ page }) => {
    await page.goto("/services/create");

    await expect(page.getByText("Необходимо войти в систему")).toBeVisible();
  });
});
```

## MCP Playwright через Claude

После перезапуска Claude Desktop, вы сможете использовать MCP Playwright для:

1. **Автоматического тестирования** - Claude может написать и запустить тесты
2. **Исследования UI** - Claude может взаимодействовать со страницами
3. **Снятия скриншотов** - для документации или отладки
4. **Проверки доступности** - автоматический анализ accessibility

### Примеры команд для Claude:

- "Протестируй страницу создания объявления"
- "Проверь, что форма валидируется правильно"
- "Сделай скриншот главной страницы"
- "Проверь доступность навигации"

## Структура тестов

```
tests/
└── e2e/
    └── create-listing.spec.ts  # Тесты страницы создания объявления
```

## Доступные возможности

### Через MCP Playwright:

- Навигация по страницам
- Клики и взаимодействие
- Заполнение форм
- Скриншоты и видео
- Ожидание элементов
- Проверка текста и атрибутов

### Браузеры:

- ✅ Chromium (основной)
- ✅ Firefox
- ✅ WebKit (Safari)

## Перезапуск Claude Desktop

**ВАЖНО:** После изменения конфигурации MCP, необходимо полностью перезапустить Claude Desktop:

1. Закрыть Claude Desktop
2. Убедиться, что процесс завершен (Диспетчер задач)
3. Запустить Claude Desktop снова
4. MCP Playwright будет доступен через контекстное меню

## Troubleshooting

### Браузеры не найдены

```bash
npx playwright install
```

### MCP не работает

1. Проверьте путь к конфигу: `%APPDATA%\Claude\claude_desktop_config.json`
2. Проверьте JSON синтаксис
3. Перезапустите Claude Desktop полностью

### Dev сервер не запускается

```bash
# Проверьте, что порт 3000 свободен
npm run dev
```

## Полезные ссылки

- [Playwright Documentation](https://playwright.dev)
- [MCP Playwright Server](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)
- [Claude MCP Documentation](https://docs.anthropic.com/claude/docs/model-context-protocol)
