import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { AuthProvider } from "@/contexts/auth-context";
import { MessagesProvider } from "@/contexts/messages-context";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NotificationBanner } from "@/components/notification-banner";
import { QueryProvider } from "@/providers/query-provider";
import { OrganizationSchema, WebsiteSchema } from "@/components/structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uilchilgee.mn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uilchilgee.mn - Монголын үйлчилгээний платформ",
    template: "%s | Uilchilgee.mn",
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
  authors: [{ name: "Uilchilgee.mn" }],
  creator: "Uilchilgee.mn",
  publisher: "Uilchilgee.mn",
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
    siteName: "Uilchilgee.mn",
    title: "Uilchilgee.mn - Монголын үйлчилгээний платформ",
    description:
      "Монголын хамгийн том үйлчилгээний платформ. Засвар, цэвэрлэгээ, тээвэр, сургалт болон бусад үйлчилгээ.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Uilchilgee.mn - Монголын үйлчилгээний платформ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uilchilgee.mn - Монголын үйлчилгээний платформ",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <FavoritesProvider>
                <MessagesProvider>
                  {children}
                  <MobileBottomNav />
                  <NotificationBanner />
                </MessagesProvider>
              </FavoritesProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
