import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Grid3x3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CategoriesModal } from "@/components/categories-modal";
import { isImageIcon, type CategoryWithChildren } from "@/lib/categories";

interface CategoriesSectionSSRProps {
  categories: CategoryWithChildren[];
}

function CategoryIcon({ cat }: { cat: CategoryWithChildren }) {
  if (isImageIcon(cat.icon)) {
    return (
      <Image
        src={cat.icon!}
        alt=""
        width={28}
        height={28}
        className="w-6 h-6 md:w-7 md:h-7 object-contain"
      />
    );
  }
  return <span className="text-xl md:text-2xl leading-none">{cat.icon || "📁"}</span>;
}

export async function CategoriesSectionSSR({ categories }: CategoriesSectionSSRProps) {
  const t = await getTranslations("home");
  // 7 категорий + 1 плитка "Все" = 8 → mobile 2×4, desktop 4×2
  const tiles = categories.slice(0, 7);

  return (
    <section className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-end justify-between mb-5 md:mb-6">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
          {t("categoriesTitle")}
        </h2>
        <CategoriesModal
          categories={categories}
          trigger={
            <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>{t("allCategories")}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          }
        />
      </div>

      <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        {tiles.map((cat, idx) => (
          <Link
            key={cat.id}
            href={`/services?category=${encodeURIComponent(cat.slug)}`}
            className="group relative flex items-center gap-3 h-14 md:h-16 px-3 md:px-4 rounded-xl bg-card ring-1 ring-border hover:ring-foreground hover:-translate-y-0.5 transition-all duration-200"
            style={{ transitionTimingFunction: "var(--ease-brand)", ["--i" as string]: idx }}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CategoryIcon cat={cat} />
            </div>
            <span className="text-sm md:text-[15px] font-medium leading-tight line-clamp-2 flex-1 min-w-0">
              {cat.name}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0 opacity-0 group-hover:opacity-100" />
          </Link>
        ))}

        <CategoriesModal
          categories={categories}
          trigger={
            <button
              className="group relative flex items-center gap-3 h-14 md:h-16 px-3 md:px-4 rounded-xl bg-foreground text-background hover:-translate-y-0.5 transition-all duration-200"
              style={{
                transitionTimingFunction: "var(--ease-brand)",
                ["--i" as string]: tiles.length,
              }}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-background/10 flex items-center justify-center shrink-0">
                <Grid3x3 className="w-4 h-4" />
              </div>
              <span className="text-sm md:text-[15px] font-medium flex-1 text-left">
                {t("allCategories")}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          }
        />
      </div>
    </section>
  );
}
