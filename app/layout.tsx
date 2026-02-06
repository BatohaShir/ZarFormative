import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { AuthProvider } from "@/contexts/auth-context";
import { LazyMessagesProvider, LazyNotificationsProvider } from "@/components/lazy-providers";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NotificationBanner } from "@/components/notification-banner";
import { RealtimeConnectionBanner } from "@/components/realtime-connection-banner";
import { QueryProvider } from "@/providers/query-provider";
import { OrganizationSchema, WebsiteSchema } from "@/components/structured-data";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tsogts.mn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tsogts.mn - Монголын үйлчилгээний платформ",
    template: "%s | Tsogts.mn",
  },
  description:
    "Монголын хамгийн том үйлчилгээний платформ. Засвар, цэвэрлэгээ, тээвэр, сургалт, IT болон бусад үйлчилгээг олж, захиалаарай.",
  keywords: [
    "үйлчилгээ",
    "Монгол",
    "засвар",
    "цэвэрлэгээ",
    "тээвэр",
    "сургалт",
    "IT",
    "гоо сайхан",
    "Улаанбаатар",
    "Дархан",
    "Эрдэнэт",
  ],
  authors: [{ name: "Tsogts.mn" }],
  creator: "Tsogts.mn",
  publisher: "Tsogts.mn",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "mn_MN",
    url: siteUrl,
    siteName: "Tsogts.mn",
    title: "Tsogts.mn - Монголын үйлчилгээний платформ",
    description:
      "Монголын хамгийн том үйлчилгээний платформ. Засвар, цэвэрлэгээ, тээвэр, сургалт болон бусад үйлчилгээ.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tsogts.mn - Монголын үйлчилгээний платформ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tsogts.mn - Монголын үйлчилгээний платформ",
    description:
      "Монголын хамгийн том үйлчилгээний платформ. Засвар, цэвэрлэгээ, тээвэр, сургалт болон бусад үйлчилгээ.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

// Supabase URL для preconnect
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Получаем текущую локаль и переводы
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect для Supabase - ускоряет загрузку изображений и API */}
        {supabaseHost && (
          <>
            <link rel="preconnect" href={`https://${supabaseHost}`} />
            <link rel="dns-prefetch" href={`https://${supabaseHost}`} />
          </>
        )}
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider>
                <FavoritesProvider>
                  <LazyNotificationsProvider>
                    <LazyMessagesProvider>
                      {children}
                      <MobileBottomNav />
                      <NotificationBanner />
                      <RealtimeConnectionBanner />
                      <Toaster
                        position="top-center"
                        closeButton
                        toastOptions={{
                          duration: 4000,
                        }}
                      />
                    </LazyMessagesProvider>
                  </LazyNotificationsProvider>
                </FavoritesProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
