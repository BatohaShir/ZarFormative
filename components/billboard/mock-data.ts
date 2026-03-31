import type { Billboard } from "./types";

export const MOCK_BILLBOARDS: Billboard[] = [
  // === Home — after hero (5 slides) ===
  {
    id: "bb-1",
    title: "Ухаалаг гэр - Smart Home",
    description: "Гэрээ ухаалаг болгоорой! Автомат гэрэлтүүлэг, аюулгүй байдлын систем суулгана.",
    image_url:
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/smart-home",
    alt_text: "Ухаалаг гэрийн систем суулгах үйлчилгээ",
    placement: "home_after_hero",
    size: "banner",
  },
  {
    id: "bb-2",
    title: "Цахим хичээл - 50% хөнгөлөлт",
    description: "Онлайнаар суралцаж, шинэ мэргэжил эзэмшээрэй. Энэ сард бүх курс -50%!",
    image_url:
      "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/online-courses",
    alt_text: "Онлайн сургалтын платформ",
    placement: "home_after_hero",
    size: "banner",
  },
  {
    id: "bb-3",
    title: "Мэргэжлийн сургалт",
    description: "Програм хангамж, дизайн, маркетингийн чиглэлээр мэргэжлийн сургалтууд.",
    image_url:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/training",
    alt_text: "Мэргэжлийн сургалт",
    placement: "home_after_hero",
    size: "banner",
  },
  {
    id: "bb-4",
    title: "Гэрийн тавилга захиалга",
    description: "Модон тавилга, гал тогооны тавилга захиалгаар хийнэ. 100% баталгаатай.",
    image_url:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/furniture",
    alt_text: "Гэрийн тавилга захиалга",
    placement: "home_after_hero",
    size: "banner",
  },
  {
    id: "bb-5",
    title: "Авто засвар үйлчилгээ",
    description: "Бүх төрлийн автомашины засвар, оношлогоо. Туршлагатай мастерууд.",
    image_url:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/auto-repair",
    alt_text: "Авто засвар үйлчилгээ",
    placement: "home_after_hero",
    size: "banner",
  },

  // === Services page — top (5 slides) ===
  {
    id: "bb-6",
    title: "Тээврийн үйлчилгээ",
    description: "Ачаа тээвэр, нүүлгэлт хөнгөн шуурхай. 24/7 ажиллана.",
    image_url:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/transport",
    alt_text: "Тээврийн үйлчилгээ захиалах",
    placement: "services_top",
    size: "banner",
  },
  {
    id: "bb-7",
    title: "Цэвэрлэгээний үйлчилгээ",
    description: "Оффис, орон сууцны мэргэжлийн цэвэрлэгээ. Найдвартай, хурдан.",
    image_url:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/cleaning",
    alt_text: "Цэвэрлэгээний үйлчилгээ",
    placement: "services_top",
    size: "banner",
  },
  {
    id: "bb-8",
    title: "IT үйлчилгээ",
    description: "Вэб сайт, аппликейшн хөгжүүлэлт. Мэдээллийн технологийн бүх шийдэл.",
    image_url:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/it-services",
    alt_text: "IT үйлчилгээ",
    placement: "services_top",
    size: "banner",
  },
  {
    id: "bb-9",
    title: "Гоо сайхны үйлчилгээ",
    description: "Үсчин, нүүр будалт, хумс. Мэргэжилтнүүдээс сонгоорой.",
    image_url:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/beauty",
    alt_text: "Гоо сайхны үйлчилгээ",
    placement: "services_top",
    size: "banner",
  },
  {
    id: "bb-10",
    title: "Хүүхдийн боловсрол",
    description: "Хичээлийн дэмжлэг, хөгжлийн хичээлүүд. Туршлагатай багш нар.",
    image_url:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop&crop=center",
    link_url: "https://example.com/education",
    alt_text: "Хүүхдийн боловсрол",
    placement: "services_top",
    size: "banner",
  },

  // === Services page — inline cards ===
  {
    id: "bb-11",
    title: "Гэрийн цэвэрлэгээ",
    description: "Мэргэжлийн цэвэрлэгээ, хямд үнэтэй",
    image_url:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop&crop=center",
    link_url: "https://example.com/cleaning",
    alt_text: "Мэргэжлийн цэвэрлэгээний үйлчилгээ",
    placement: "services_inline",
    size: "card",
  },
  {
    id: "bb-12",
    title: "Компьютер засвар",
    description: "Бүх төрлийн компьютер, ноутбук засна",
    image_url:
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=450&fit=crop&crop=center",
    link_url: "https://example.com/computer-repair",
    alt_text: "Компьютер засварлах үйлчилгээ",
    placement: "services_inline",
    size: "card",
  },
];

export function getMockBillboards(placement: Billboard["placement"]): Billboard[] {
  return MOCK_BILLBOARDS.filter((b) => b.placement === placement);
}
