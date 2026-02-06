# Tsogts.mn - Платформа для поиска услуг

Современная веб-платформа для размещения и поиска услуг в Монголии, построенная на Next.js 16 и React 19.

## 🚀 Возможности

- ✅ Аутентификация пользователей (NextAuth.js)
- ✅ Поиск и фильтрация услуг
- ✅ Избранные услуги
- ✅ Система сообщений и запросов
- ✅ Профили пользователей
- ✅ Отзывы и рейтинги
- ✅ Темная/светлая тема
- ✅ Полностью адаптивный дизайн
- ✅ TypeScript для типобезопасности
- ✅ Comprehensive error handling
- ✅ Unit и integration тесты

## 📋 Требования

- Node.js 20.x или выше
- PostgreSQL 14.x или выше
- npm или yarn

## 🛠️ Установка

### 1. Клонирование репозитория

\`\`\`bash
git clone <repository-url>
cd zar-formative
\`\`\`

### 2. Установка зависимостей

\`\`\`bash
npm install
\`\`\`

### 3. Настройка переменных окружения

Создайте файл \`.env\` на основе \`.env.example\`:

\`\`\`bash
cp .env.example .env
\`\`\`

Заполните переменные:

\`\`\`env

# Database

DATABASE_URL="postgresql://user:password@localhost:5432/zar_formative"

# NextAuth.js

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Сгенерируйте: openssl rand -base64 32

# OAuth (опционально)

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
\`\`\`

### 4. Настройка базы данных

\`\`\`bash

# Генерация Prisma клиента

npm run db:generate

# Применение миграций

npm run db:migrate

# (Опционально) Открыть Prisma Studio

npm run db:studio
\`\`\`

### 5. Запуск в режиме разработки

\`\`\`bash
npm run dev
\`\`\`

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## 📝 Доступные скрипты

\`\`\`bash

# Разработка

npm run dev # Запустить dev сервер
npm run build # Собрать production build
npm run start # Запустить production сервер

# Тестирование

npm test # Запустить тесты
npm run test:watch # Запустить тесты в watch режиме
npm run test:coverage # Запустить с coverage

# Код качество

npm run lint # Проверить код ESLint
npm run lint:fix # Исправить ESLint ошибки
npm run format # Форматировать код Prettier
npm run format:check # Проверить форматирование
npm run type-check # Проверить TypeScript типы

# База данных

npm run db:generate # Генерировать Prisma клиент
npm run db:push # Push schema без миграций
npm run db:migrate # Создать и применить миграции
npm run db:studio # Открыть Prisma Studio
\`\`\`

## 🏗️ Архитектура

### Структура проекта

\`\`\`
zar-formative/
├── app/ # Next.js App Router
│ ├── api/ # API routes
│ │ ├── auth/ # Authentication endpoints
│ │ └── services/ # Services endpoints
│ ├── services/ # Services pages
│ ├── favorites/ # Favorites page
│ ├── messages/ # Messages page
│ ├── error.tsx # Error boundary
│ └── layout.tsx # Root layout
├── components/ # React components
│ ├── ui/ # shadcn/ui components
│ └── ... # Feature components
├── contexts/ # React Context providers
│ ├── auth-context.tsx
│ ├── favorites-context.tsx
│ └── messages-context.tsx
├── lib/ # Utilities
│ ├── prisma.ts # Prisma client
│ ├── auth.ts # NextAuth config
│ ├── error-handler.ts # Error utilities
│ └── validations/ # Zod schemas
├── prisma/ # Database
│ └── schema.prisma # Database schema
└── **tests**/ # Tests
├── contexts/
└── lib/
\`\`\`

### Технологический стек

**Frontend:**

- Next.js 16.1.1 (App Router)
- React 19.2.3 (с React Compiler)
- TypeScript 5.x
- Tailwind CSS 4.x
- Radix UI (доступность)
- Lucide React (иконки)

**Backend:**

- Next.js API Routes
- NextAuth.js (аутентификация)
- Prisma ORM
- PostgreSQL

**Валидация & Формы:**

- Zod (валидация схем)
- React Hook Form

**Тестирование:**

- Jest
- React Testing Library

**Код качество:**

- ESLint
- Prettier
- Husky (git hooks)

## 🔒 Безопасность

### Аутентификация

Проект использует **NextAuth.js** для безопасной аутентификации:

- JWT сессии
- httpOnly cookies
- CSRF защита
- bcrypt для хеширования паролей
- OAuth провайдеры (Google)

### Защита API

Все защищенные endpoints проверяют аутентификацию:

\`\`\`typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session?.user?.id) {
throw new AuthenticationError();
}
\`\`\`

### Валидация данных

Используется Zod для валидации всех входных данных:

\`\`\`typescript
const validationResult = createServiceSchema.safeParse(body);
if (!validationResult.success) {
throw new ValidationError(validationResult.error.errors[0].message);
}
\`\`\`

## 🧪 Тестирование

### Запуск тестов

\`\`\`bash

# Все тесты

npm test

# Watch режим

npm run test:watch

# С coverage

npm run test:coverage
\`\`\`

### Структура тестов

\`\`\`
**tests**/
├── contexts/ # Unit тесты для contexts
│ └── favorites-context.test.tsx
├── lib/ # Unit тесты для utilities
│ ├── error-handler.test.ts
│ └── validations/
│ └── auth.test.ts
└── components/ # Component тесты
\`\`\`

## 📡 API Документация

### Authentication

#### POST /api/auth/register

Регистрация нового пользователя.

**Request:**
\`\`\`json
{
"name": "John Doe",
"email": "john@example.com",
"password": "password123",
"confirmPassword": "password123",
"phone": "99112233"
}
\`\`\`

**Response:**
\`\`\`json
{
"success": true,
"message": "Амжилттай бүртгэгдлээ",
"user": {
"id": "...",
"name": "John Doe",
"email": "john@example.com"
}
}
\`\`\`

### Services

#### GET /api/services

Получить список услуг с фильтрацией.

**Query Parameters:**

- \`categoryId\` - Фильтр по категории
- \`city\` - Фильтр по городу
- \`search\` - Поиск по названию/описанию
- \`minRating\` - Минимальный рейтинг
- \`page\` - Номер страницы (default: 1)
- \`limit\` - Количество на страницу (default: 12)

**Response:**
\`\`\`json
{
"success": true,
"data": [...],
"pagination": {
"page": 1,
"limit": 12,
"total": 50,
"totalPages": 5
}
}
\`\`\`

#### POST /api/services

Создать новую услугу (требует аутентификации).

#### GET /api/services/:id

Получить детали услуги.

#### PATCH /api/services/:id

Обновить услугу (требует аутентификации и владения).

#### DELETE /api/services/:id

Удалить услугу (требует аутентификации и владения).

## 🎨 UI Components

Проект использует **shadcn/ui** компоненты поверх **Radix UI**.

## 🚀 Деплой

### Vercel (Рекомендуется)

1. Push код в GitHub
2. Импортируйте проект в Vercel
3. Добавьте environment variables
4. Деплой!

## 🤝 Contributing

1. Fork проект
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Откройте Pull Request

### Правила кода

- Используйте TypeScript
- Следуйте ESLint правилам
- Пишите тесты для новой функциональности
- Форматируйте код с Prettier

## 📄 Лицензия

[MIT License](LICENSE)
