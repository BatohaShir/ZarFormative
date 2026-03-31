"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Link as LinkIcon,
  ImageIcon,
  Film,
  CreditCard,
  Check,
  ArrowRight,
} from "lucide-react";
import { MOCK_STORIES } from "./mock-stories";
import type { AdStory } from "./types";
import { cn } from "@/lib/utils";

const SLIDE_DURATION = 5000; // 5 seconds per slide

// ============================================
// Story Circle — кружочек в ленте
// ============================================

function StoryCircle({
  story,
  hasNew,
  onClick,
}: {
  story: AdStory;
  hasNew: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-17 md:w-19 shrink-0">
      <div
        className={cn(
          "w-15.5 h-15.5 md:w-17 md:h-17 rounded-full p-[2.5px]",
          hasNew ? "bg-linear-to-br from-blue-500 to-blue-400" : "bg-muted"
        )}
      >
        <div className="w-full h-full rounded-full bg-background p-0.5">
          <Image
            src={story.company_logo}
            alt={story.company_name}
            width={68}
            height={68}
            unoptimized
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      {hasNew && (
        <span className="text-[8px] md:text-[9px] text-white font-bold bg-blue-500 px-1.5 py-px rounded-full leading-none uppercase tracking-wide">
          new
        </span>
      )}
      <span className="text-[10px] md:text-xs text-foreground font-medium truncate w-full text-center leading-tight">
        {story.company_name}
      </span>
    </button>
  );
}

// ============================================
// Story Viewer — fullscreen просмотр
// ============================================

function StoryViewer({
  stories,
  initialStoryIndex,
  initialSlideIndex,
  onClose,
  onSlideViewed,
}: {
  stories: AdStory[];
  initialStoryIndex: number;
  initialSlideIndex: number;
  onClose: () => void;
  onSlideViewed: (slideId: string) => void;
}) {
  const [storyIndex, setStoryIndex] = React.useState(initialStoryIndex);
  const [slideIndex, setSlideIndex] = React.useState(initialSlideIndex);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const animRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef(0);
  const pausedAtRef = React.useRef(0);

  const story = stories[storyIndex];
  const slide = story.slides[slideIndex];
  const totalSlides = story.slides.length;

  // Mark slide as viewed
  React.useEffect(() => {
    onSlideViewed(slide.id);
  }, [slide.id, onSlideViewed]);

  // Progress animation
  React.useEffect(() => {
    if (isPaused) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    startTimeRef.current = performance.now() - pausedAtRef.current * SLIDE_DURATION;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / SLIDE_DURATION, 1);
      setProgress(p);

      if (p >= 1) {
        if (slideIndex < totalSlides - 1) {
          setSlideIndex((prev) => prev + 1);
        } else if (storyIndex < stories.length - 1) {
          setStoryIndex((prev) => prev + 1);
          setSlideIndex(0);
        } else {
          onClose();
        }
        pausedAtRef.current = 0;
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPaused, slideIndex, storyIndex, totalSlides, stories.length, onClose]);

  // Reset progress on slide/story change
  React.useEffect(() => {
    setProgress(0);
    pausedAtRef.current = 0;
    startTimeRef.current = performance.now();
  }, [slideIndex, storyIndex]);

  // Lock body scroll
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goBack = React.useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    } else if (storyIndex > 0) {
      const prevStory = stories[storyIndex - 1];
      setStoryIndex((prev) => prev - 1);
      setSlideIndex(prevStory.slides.length - 1);
    }
    pausedAtRef.current = 0;
  }, [slideIndex, storyIndex, stories]);

  const goForward = React.useCallback(() => {
    if (slideIndex < totalSlides - 1) {
      setSlideIndex((prev) => prev + 1);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setSlideIndex(0);
    } else {
      onClose();
    }
    pausedAtRef.current = 0;
  }, [slideIndex, totalSlides, storyIndex, stories.length, onClose]);

  const handlePause = React.useCallback(() => {
    pausedAtRef.current = progress;
    setIsPaused(true);
  }, [progress]);

  const handleResume = React.useCallback(() => {
    setIsPaused(false);
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goBack();
      if (e.key === "ArrowRight") goForward();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goBack, goForward]);

  const handleTap = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3) {
        goBack();
      } else {
        goForward();
      }
    },
    [goBack, goForward]
  );

  return (
    <div className="fixed inset-0 z-100 bg-black flex items-center justify-center">
      <div
        className="relative w-full h-full max-w-120 max-h-dvh md:max-h-[90vh] md:rounded-2xl overflow-hidden"
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
        onClick={handleTap}
      >
        <Image
          src={slide.image_url}
          alt={story.company_name}
          fill
          className="object-cover"
          priority
        />

        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10 pointer-events-none">
          {story.slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.75 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < slideIndex ? "100%" : i === slideIndex ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <Image
              src={story.company_logo}
              alt={story.company_name}
              width={36}
              height={36}
              unoptimized
              className="w-8 h-8 rounded-full ring-2 ring-white/30"
            />
            <span className="text-white text-sm font-semibold drop-shadow-lg">
              {story.company_name}
            </span>
            <span className="text-white/60 text-xs">Реклам</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CTA link */}
        {slide.link_url && (
          <div className="absolute bottom-6 inset-x-0 flex justify-center z-10 pointer-events-none">
            <a
              href={slide.link_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto inline-flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl hover:bg-white/90 transition-colors"
            >
              Дэлгэрэнгүй
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {/* Desktop arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goBack();
        }}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors z-10"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          goForward();
        }}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-colors z-10"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

// ============================================
// Create Ad Modal
// ============================================

function CreateAdModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [mediaType, setMediaType] = React.useState<"photo" | "video" | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleFileSelect = (type: "photo" | "video") => {
    setMediaType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const stepTitles = { 1: "Реклам нэмэх", 2: "Төлбөр" };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-semibold text-lg">{stepTitles[step]}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-1 px-4 pt-3">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`}
          />
        </div>

        {/* Step 1: Upload media */}
        {step === 1 && (
          <>
            <div className="p-4 space-y-4">
              {/* Media type selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Видео эсвэл зураг (9:16)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleFileSelect("photo")}
                    className={cn(
                      "h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                      mediaType === "photo"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-sm font-medium">Зураг</span>
                  </button>
                  <button
                    onClick={() => handleFileSelect("video")}
                    className={cn(
                      "h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                      mediaType === "video"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    <Film className="h-7 w-7" />
                    <span className="text-sm font-medium">Видео</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === "video" ? "video/*" : "image/*"}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg px-3 py-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                )}
              </div>

              {/* Company name */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Компанийн нэр</label>
                <input
                  type="text"
                  placeholder="Таны компани"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Link */}
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Холбоос (заавал биш)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => setStep(2)}
                disabled={!fileName}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Үргэлжлүүлэх
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <>
            <div className="p-4 space-y-4">
              {/* Plan selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block">Багц сонгох</label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary bg-primary/5 cursor-pointer">
                  <input type="radio" name="plan" defaultChecked className="accent-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">1 хоног</p>
                    <p className="text-xs text-muted-foreground">24 цагийн турш харагдана</p>
                  </div>
                  <span className="font-bold">5,000₮</span>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border hover:border-primary/40 cursor-pointer transition-colors">
                  <input type="radio" name="plan" className="accent-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">2 хоног</p>
                    <p className="text-xs text-muted-foreground">48 цагийн турш харагдана</p>
                  </div>
                  <span className="font-bold">9,000₮</span>
                </label>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-sm font-medium mb-2 block">Төлбөрийн хэлбэр</label>
                <div className="h-12 rounded-lg border-2 border-primary bg-primary/5 text-sm font-medium flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  QPay
                </div>
              </div>
            </div>

            <div className="p-4 border-t">
              <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                Төлбөр төлөх
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// AdStories — горизонтальная лента кружочков
// ============================================

export function AdStories() {
  // Track viewed slide IDs
  const [viewedSlideIds, setViewedSlideIds] = React.useState<Set<string>>(new Set());
  const [openStoryIndex, setOpenStoryIndex] = React.useState<number | null>(null);
  const [openSlideIndex, setOpenSlideIndex] = React.useState(0);

  const handleSlideViewed = React.useCallback((slideId: string) => {
    setViewedSlideIds((prev) => new Set(prev).add(slideId));
  }, []);

  const stories = MOCK_STORIES;

  // Find first unseen slide index for a story
  const getFirstUnseenSlideIndex = React.useCallback(
    (story: AdStory): number => {
      const idx = story.slides.findIndex((s) => !viewedSlideIds.has(s.id));
      return idx >= 0 ? idx : 0;
    },
    [viewedSlideIds]
  );

  // Check if story has unseen slides
  const hasNewSlides = React.useCallback(
    (story: AdStory): boolean => {
      return story.slides.some((s) => !viewedSlideIds.has(s.id));
    },
    [viewedSlideIds]
  );

  const handleOpenStory = React.useCallback(
    (index: number) => {
      const story = stories[index];
      setOpenSlideIndex(getFirstUnseenSlideIndex(story));
      setOpenStoryIndex(index);
    },
    [stories, getFirstUnseenSlideIndex]
  );

  const [showCreateModal, setShowCreateModal] = React.useState(false);

  return (
    <>
      <div className="container mx-auto px-4">
        <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide py-1">
          {/* Add Story button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center gap-1 w-17 md:w-19 shrink-0"
          >
            <div className="w-15.5 h-15.5 md:w-17 md:h-17 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary/60 hover:bg-primary/5 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
              Реклам авах
            </span>
          </button>

          {stories.map((story, index) => (
            <StoryCircle
              key={story.id}
              story={story}
              hasNew={hasNewSlides(story)}
              onClick={() => handleOpenStory(index)}
            />
          ))}
        </div>
      </div>

      {/* Create Ad Modal */}
      {showCreateModal && <CreateAdModal onClose={() => setShowCreateModal(false)} />}

      {openStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialStoryIndex={openStoryIndex}
          initialSlideIndex={openSlideIndex}
          onClose={() => setOpenStoryIndex(null)}
          onSlideViewed={handleSlideViewed}
        />
      )}
    </>
  );
}
