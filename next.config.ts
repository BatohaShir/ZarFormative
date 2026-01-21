import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler отключен из-за несовместимости с ZenStack хуками в React 19 Strict Mode
  // reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/favorites",
        destination: "/account/me/favorites",
        permanent: true,
      },
      {
        source: "/requests",
        destination: "/account/me/requests",
        permanent: true,
      },
      {
        source: "/account/notifications",
        destination: "/account/me/notifications",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    // Оптимизация изображений
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней кэширования
  },
};

export default nextConfig;
