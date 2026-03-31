export type BillboardPlacement =
  | "home_after_hero"
  | "home_after_recommended"
  | "services_top"
  | "services_inline";

export type BillboardSize = "banner" | "card";

export interface Billboard {
  id: string;
  title: string;
  description?: string | null;
  image_url: string;
  image_url_dark?: string | null;
  link_url: string;
  alt_text?: string | null;
  placement: BillboardPlacement;
  size: BillboardSize;
}

export interface StorySlide {
  id: string;
  image_url: string;
  link_url?: string;
}

export interface AdStory {
  id: string;
  company_name: string;
  company_logo: string;
  slides: StorySlide[];
}
