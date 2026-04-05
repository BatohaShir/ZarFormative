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

// DB story from API
export interface DbAdStory {
  id: string;
  user_id: string;
  image_url: string;
  plan: string;
  status: string;
  editor_data: EditorData | null;
  views_count: number;
  created_at: string;
  expires_at: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    is_company: boolean;
  };
}

export interface EditorData {
  texts: EditorText[];
  stickers: EditorSticker[];
  rotation: number;
  brightness: number;
}

export interface EditorText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  bgStyle: "none" | "filled" | "outline";
  strikethrough: boolean;
}

export interface EditorSticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}
