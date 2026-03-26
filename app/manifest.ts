import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tsogts.mn - Монголын үйлчилгээний платформ",
    short_name: "Tsogts.mn",
    description:
      "Монголын хамгийн том үйлчилгээний платформ. Засвар, тээвэр, сургалт болон бусад үйлчилгээг олоорой.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#015197",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
