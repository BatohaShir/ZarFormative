import type { AdStory } from "./types";

export const MOCK_STORIES: AdStory[] = [
  {
    id: "story-1",
    company_name: "Smart Home",
    company_logo:
      "https://api.dicebear.com/9.x/initials/svg?seed=SH&backgroundColor=3b82f6&textColor=ffffff",
    slides: [
      {
        id: "s1-1",
        image_url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=700&fit=crop",
        link_url: "https://example.com/smart-home",
      },
      {
        id: "s1-2",
        image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=700&fit=crop",
        link_url: "https://example.com/smart-home",
      },
      {
        id: "s1-3",
        image_url:
          "https://images.unsplash.com/photo-1585128903994-9788298932a4?w=400&h=700&fit=crop",
      },
    ],
  },
  {
    id: "story-2",
    company_name: "AutoFix",
    company_logo:
      "https://api.dicebear.com/9.x/initials/svg?seed=AF&backgroundColor=ef4444&textColor=ffffff",
    slides: [
      {
        id: "s2-1",
        image_url:
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=700&fit=crop",
        link_url: "https://example.com/auto",
      },
      {
        id: "s2-2",
        image_url:
          "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=700&fit=crop",
      },
    ],
  },
  {
    id: "story-3",
    company_name: "EduMN",
    company_logo:
      "https://api.dicebear.com/9.x/initials/svg?seed=EM&backgroundColor=8b5cf6&textColor=ffffff",
    slides: [
      {
        id: "s3-1",
        image_url:
          "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=700&fit=crop",
        link_url: "https://example.com/edu",
      },
      {
        id: "s3-2",
        image_url:
          "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=700&fit=crop",
      },
      {
        id: "s3-3",
        image_url:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=700&fit=crop",
      },
    ],
  },
  {
    id: "story-4",
    company_name: "CleanPro",
    company_logo:
      "https://api.dicebear.com/9.x/initials/svg?seed=CP&backgroundColor=22c55e&textColor=ffffff",
    slides: [
      {
        id: "s4-1",
        image_url:
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=700&fit=crop",
        link_url: "https://example.com/clean",
      },
      {
        id: "s4-2",
        image_url:
          "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=700&fit=crop",
      },
    ],
  },
  {
    id: "story-5",
    company_name: "TechFix",
    company_logo:
      "https://api.dicebear.com/9.x/initials/svg?seed=TF&backgroundColor=f59e0b&textColor=ffffff",
    slides: [
      {
        id: "s5-1",
        image_url:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=700&fit=crop",
        link_url: "https://example.com/tech",
      },
      {
        id: "s5-2",
        image_url:
          "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=700&fit=crop",
      },
      {
        id: "s5-3",
        image_url:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=700&fit=crop",
      },
    ],
  },
];
