"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  ImageIcon,
  ArrowRight,
  Type,
  RotateCw,
  Sticker,
  Sun,
  Sparkles,
} from "lucide-react";
import type { DbAdStory, EditorData } from "./types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { uploadStoryImage } from "@/lib/storage/ad-stories";
import { useFindManyad_stories, useCreatead_stories } from "@/lib/hooks/ad-stories";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SLIDE_DURATION = 5000; // 5 seconds per slide

// ============================================
// Grouped stories by user
// ============================================

interface GroupedStory {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: DbAdStory[];
}

function groupStoriesByUser(stories: DbAdStory[]): GroupedStory[] {
  const map = new Map<string, GroupedStory>();
  for (const story of stories) {
    const existing = map.get(story.user_id);
    if (existing) {
      existing.stories.push(story);
    } else {
      const name = getDisplayName(story.user);
      map.set(story.user_id, {
        userId: story.user_id,
        userName: name,
        userAvatar:
          story.user.avatar_url ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
        stories: [story],
      });
    }
  }
  // Sort stories within each group: oldest first (chronological viewing order)
  for (const group of map.values()) {
    group.stories.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  return Array.from(map.values());
}

function getDisplayName(user: DbAdStory["user"]): string {
  if (user.is_company && user.company_name) return user.company_name;
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";
}

// ============================================
// Story Circle — кружочек в ленте
// ============================================

// SVG segmented ring around story circle
function StoryRing({
  total,
  viewedSet,
  storyIds,
  size,
}: {
  total: number;
  viewedSet: Set<string>;
  storyIds: string[];
  size: number;
}) {
  if (total === 0) return null;
  const r = (size - 4) / 2; // radius
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 2.5;
  const gap = total === 1 ? 0 : 12; // degrees gap between segments
  const totalGap = gap * total;
  const segmentAngle = (360 - totalGap) / total;

  // Single story — full circle
  if (total === 1) {
    const viewed = viewedSet.has(storyIds[0]);
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={viewed ? "#d1d5db" : "#3b82f6"}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  // Multiple stories — segmented arcs
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 w-full h-full"
      style={{ transform: "rotate(-90deg)" }}
    >
      {storyIds.map((id, i) => {
        const viewed = viewedSet.has(id);
        const startAngle = gap / 2 + i * (segmentAngle + gap);
        const endAngle = startAngle + segmentAngle;
        const start = polarToCartesian(cx, cy, r, startAngle);
        const end = polarToCartesian(cx, cy, r, endAngle);
        const largeArc = segmentAngle > 180 ? 1 : 0;
        const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
        return (
          <path
            key={id}
            d={d}
            fill="none"
            stroke={viewed ? "#d1d5db" : "#3b82f6"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const StoryCircle = React.memo(function StoryCircle({
  group,
  viewedIds,
  onClick,
  priority = false,
}: {
  group: GroupedStory;
  viewedIds: Set<string>;
  onClick: () => void;
  /** Eager-load the avatar for the first few circles so they paint
   *  without waiting for lazy-load intersection. */
  priority?: boolean;
}) {
  const storyIds = group.stories.map((s) => s.id);

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-17 md:w-19 shrink-0">
      <div className="relative w-15.5 h-15.5 md:w-17 md:h-17">
        {/* Segmented ring */}
        <StoryRing
          total={group.stories.length}
          viewedSet={viewedIds}
          storyIds={storyIds}
          size={68}
        />
        {/* Avatar */}
        <div className="absolute inset-[3px] rounded-full bg-background p-0.5">
          <Image
            src={group.userAvatar}
            alt={group.userName}
            width={60}
            height={60}
            unoptimized
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      <span className="text-[10px] md:text-xs text-muted-foreground truncate w-full text-center leading-tight">
        {group.userName}
      </span>
    </button>
  );
});

// ============================================
// Story Viewer — fullscreen просмотр
// ============================================

function StoryViewer({
  groups,
  initialGroupIndex,
  initialSlideIndex,
  onClose,
  onViewed,
}: {
  groups: GroupedStory[];
  initialGroupIndex: number;
  initialSlideIndex: number;
  onClose: () => void;
  onViewed: (storyId: string) => void;
}) {
  const [groupIndex, setGroupIndex] = React.useState(initialGroupIndex);
  const [slideIndex, setSlideIndex] = React.useState(initialSlideIndex);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const animRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef(0);
  const pausedAtRef = React.useRef(0);

  const group = groups[groupIndex];
  const story = group.stories[slideIndex];
  const totalSlides = group.stories.length;
  const editorData = story.editor_data as EditorData | null;

  // Mark as viewed
  React.useEffect(() => {
    onViewed(story.id);
  }, [story.id, onViewed]);

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
        } else if (groupIndex < groups.length - 1) {
          setGroupIndex((prev) => prev + 1);
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
  }, [isPaused, slideIndex, totalSlides, groupIndex, groups.length, onClose]);

  React.useEffect(() => {
    setProgress(0);
    pausedAtRef.current = 0;
    startTimeRef.current = performance.now();
  }, [slideIndex, groupIndex]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goBack = React.useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setSlideIndex(prevGroup.stories.length - 1);
    }
    pausedAtRef.current = 0;
  }, [slideIndex, groupIndex, groups]);

  const goForward = React.useCallback(() => {
    if (slideIndex < totalSlides - 1) {
      setSlideIndex((prev) => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setSlideIndex(0);
    } else {
      onClose();
    }
    pausedAtRef.current = 0;
  }, [slideIndex, totalSlides, groupIndex, groups.length, onClose]);

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
      if (x < rect.width * 0.3) goBack();
      else goForward();
    },
    [goBack, goForward]
  );

  const handlePause = React.useCallback(() => {
    pausedAtRef.current = progress;
    setIsPaused(true);
  }, [progress]);

  const handleResume = React.useCallback(() => setIsPaused(false), []);

  const imageFilter =
    editorData && editorData.brightness !== 100 ? `brightness(${editorData.brightness}%)` : "none";
  const rotation = editorData?.rotation || 0;

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
          src={story.image_url}
          alt={group.userName}
          fill
          className="object-cover"
          style={{ transform: `rotate(${rotation}deg)`, filter: imageFilter }}
          priority
        />

        {/* Editor overlays */}
        {editorData?.texts?.map((t) => (
          <div
            key={t.id}
            className="absolute z-10 pointer-events-none select-none"
            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              className="px-2 py-1 rounded-lg inline-block font-bold"
              style={{
                color: t.bgStyle === "outline" ? "transparent" : t.color,
                fontSize: `${t.fontSize}px`,
                fontFamily: t.fontFamily,
                textDecoration: t.strikethrough ? "line-through" : "none",
                textDecorationColor: t.strikethrough ? t.color : undefined,
                backgroundColor: t.bgStyle === "filled" ? "rgba(0,0,0,0.6)" : "transparent",
                WebkitTextStroke: t.bgStyle === "outline" ? `1.5px ${t.color}` : "none",
                textShadow: t.bgStyle === "none" ? "0 2px 8px rgba(0,0,0,0.8)" : "none",
              }}
            >
              {t.text}
            </span>
          </div>
        ))}
        {editorData?.stickers?.map((s) => (
          <div
            key={s.id}
            className="absolute z-10 pointer-events-none select-none"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${s.size}px`,
              lineHeight: 1,
            }}
          >
            {s.emoji}
          </div>
        ))}

        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Progress bar */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10 pointer-events-none">
          {group.stories.map((_, i) => (
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
              src={group.userAvatar}
              alt={group.userName}
              width={36}
              height={36}
              unoptimized
              className="w-8 h-8 rounded-full ring-2 ring-white/30"
            />
            <span className="text-white text-sm font-semibold drop-shadow-lg">
              {group.userName}
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
      </div>

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
// Story Editor — fullscreen preview with tools
// ============================================

const EDITOR_TOOLS = [
  { id: "text", icon: Type, label: "Текст" },
  { id: "sticker", icon: Sticker, label: "Стикер" },
  { id: "rotate", icon: RotateCw, label: "Эргүүлэх" },
  { id: "brightness", icon: Sun, label: "Гэрэл" },
] as const;

type ToolId = (typeof EDITOR_TOOLS)[number]["id"];

// --- Text overlay ---
type TextBgStyle = "none" | "filled" | "outline";

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percent
  y: number; // percent
  color: string;
  fontSize: number;
  fontFamily: string;
  bgStyle: TextBgStyle;
  strikethrough: boolean;
}

const TEXT_FONTS = [
  { id: "sans", label: "Sans", css: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "mono", label: "Mono", css: "var(--font-geist-mono), monospace" },
  { id: "serif", label: "Serif", css: "Georgia, serif" },
  { id: "cursive", label: "Гар бичмэл", css: "'Segoe Script', 'Comic Sans MS', cursive" },
];

// --- Sticker overlay ---
interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const STICKER_PACKS = [
  ["🔥", "❤️", "⭐", "👍", "🎉", "😍", "💯", "🏷️"],
  ["📍", "🛒", "💰", "📞", "⏰", "✅", "🆕", "🔝"],
  ["🚗", "🏠", "💻", "📱", "👔", "🎓", "🔧", "🎨"],
];

const TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#ff3b30",
  "#ff9500",
  "#ffcc00",
  "#34c759",
  "#007aff",
  "#af52de",
  "#ff2d55",
];

function StoryEditor({
  previewUrl,
  onClose,
  onChangeMedia,
  onContinue,
}: {
  previewUrl: string;
  onClose: () => void;
  onChangeMedia: () => void;
  onContinue: (data: EditorData) => void;
}) {
  const [activeTool, setActiveTool] = React.useState<ToolId | null>(null);
  const [rotation, setRotation] = React.useState(0);
  const [brightness, setBrightness] = React.useState(100);

  // Text overlays
  const [texts, setTexts] = React.useState<TextOverlay[]>([]);
  const [editingTextId, setEditingTextId] = React.useState<string | null>(null);
  const [textColor, setTextColor] = React.useState("#ffffff");
  const [textFontSize, setTextFontSize] = React.useState(24);
  const [textBgStyle, setTextBgStyle] = React.useState<TextBgStyle>("none");
  const [textStrikethrough, setTextStrikethrough] = React.useState(false);
  const [textFontFamily, setTextFontFamily] = React.useState(TEXT_FONTS[0].css);

  // Sticker overlays
  const [stickers, setStickers] = React.useState<StickerOverlay[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Dragging overlays
  const [dragging, setDragging] = React.useState<{ type: "text" | "sticker"; id: string } | null>(
    null
  );
  const dragStartRef = React.useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
  } | null>(null);

  const handleToolClick = React.useCallback((toolId: ToolId) => {
    if (toolId === "rotate") {
      setRotation((prev) => (prev + 90) % 360);
      return;
    }
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setEditingTextId(null);
  }, []);

  // --- Text ---
  const addText = React.useCallback(() => {
    const newText: TextOverlay = {
      id: crypto.randomUUID(),
      text: "Текст",
      x: 50,
      y: 50,
      color: textColor,
      fontSize: textFontSize,
      fontFamily: textFontFamily,
      bgStyle: textBgStyle,
      strikethrough: textStrikethrough,
    };
    setTexts((prev) => [...prev, newText]);
    setEditingTextId(newText.id);
  }, [textColor, textFontSize, textFontFamily, textBgStyle, textStrikethrough]);

  // Apply style changes to selected text
  React.useEffect(() => {
    if (editingTextId) {
      updateText(editingTextId, {
        color: textColor,
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        bgStyle: textBgStyle,
        strikethrough: textStrikethrough,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textColor, textFontSize, textFontFamily, textBgStyle, textStrikethrough]);

  const updateText = React.useCallback((id: string, updates: Partial<TextOverlay>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteText = React.useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
    setEditingTextId((prev) => (prev === id ? null : prev));
  }, []);

  // --- Stickers ---
  const addSticker = React.useCallback((emoji: string) => {
    const newSticker: StickerOverlay = {
      id: crypto.randomUUID(),
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: 48,
    };
    setStickers((prev) => [...prev, newSticker]);
  }, []);

  const deleteSticker = React.useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // --- Drag overlays ---
  const handleOverlayDragStart = React.useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      type: "text" | "sticker",
      id: string,
      currentX: number,
      currentY: number
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragging({ type, id });
      dragStartRef.current = { startX: clientX, startY: clientY, elemX: currentX, elemY: currentY };
    },
    []
  );

  React.useEffect(() => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = ((clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((clientY - dragStartRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, dragStartRef.current.elemX + dx));
      const newY = Math.max(5, Math.min(95, dragStartRef.current.elemY + dy));

      if (dragging.type === "text") {
        updateText(dragging.id, { x: newX, y: newY });
      } else {
        setStickers((prev) =>
          prev.map((s) => (s.id === dragging.id ? { ...s, x: newX, y: newY } : s))
        );
      }
    };

    const handleEnd = () => {
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging]);

  const imageFilter = brightness !== 100 ? `brightness(${brightness}%)` : "none";

  return (
    <div className="fixed inset-0 z-100 bg-black flex items-center justify-center">
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-120 max-h-dvh md:max-h-[90vh] md:rounded-2xl overflow-hidden"
      >
        {/* Media */}
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-full object-cover transition-all duration-300"
          style={{ transform: `rotate(${rotation}deg)`, filter: imageFilter }}
          draggable={false}
        />

        {/* Text overlays */}
        {texts.map((t) => (
          <div
            key={t.id}
            className="absolute z-15 select-none"
            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -50%)" }}
            onMouseDown={(e) => handleOverlayDragStart(e, "text", t.id, t.x, t.y)}
            onTouchStart={(e) => handleOverlayDragStart(e, "text", t.id, t.x, t.y)}
          >
            {editingTextId === t.id ? (
              <div className="flex flex-col items-center gap-1">
                <input
                  autoFocus
                  value={t.text}
                  onChange={(e) => updateText(t.id, { text: e.target.value })}
                  onBlur={() => setEditingTextId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingTextId(null);
                  }}
                  className="text-center border border-white/40 rounded-lg px-3 py-1.5 outline-none min-w-24"
                  style={{
                    color: t.color,
                    fontSize: `${t.fontSize}px`,
                    fontFamily: t.fontFamily,
                    textDecoration: t.strikethrough ? "line-through" : "none",
                    backgroundColor: t.bgStyle === "filled" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
                    WebkitTextStroke: t.bgStyle === "outline" ? `1px ${t.color}` : "none",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteText(t.id);
                  }}
                  className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="cursor-move"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === "text") {
                    setEditingTextId(t.id);
                    setTextColor(t.color);
                    setTextFontSize(t.fontSize);
                    setTextFontFamily(t.fontFamily);
                    setTextBgStyle(t.bgStyle);
                    setTextStrikethrough(t.strikethrough);
                  }
                }}
              >
                <span
                  className="px-2 py-1 rounded-lg inline-block"
                  style={{
                    color: t.bgStyle === "outline" ? "transparent" : t.color,
                    fontSize: `${t.fontSize}px`,
                    fontFamily: t.fontFamily,
                    fontWeight: "bold",
                    textDecoration: t.strikethrough ? "line-through" : "none",
                    textDecorationColor: t.strikethrough ? t.color : undefined,
                    backgroundColor: t.bgStyle === "filled" ? "rgba(0,0,0,0.6)" : "transparent",
                    WebkitTextStroke: t.bgStyle === "outline" ? `1.5px ${t.color}` : "none",
                    textShadow:
                      t.bgStyle === "none"
                        ? "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)"
                        : "none",
                  }}
                >
                  {t.text}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Sticker overlays */}
        {stickers.map((s) => (
          <div
            key={s.id}
            className="absolute z-15 select-none cursor-move"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${s.size}px`,
              lineHeight: 1,
            }}
            onMouseDown={(e) => handleOverlayDragStart(e, "sticker", s.id, s.x, s.y)}
            onTouchStart={(e) => handleOverlayDragStart(e, "sticker", s.id, s.x, s.y)}
          >
            {s.emoji}
            {activeTool === "sticker" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSticker(s.id);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Gradients */}
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/50 to-transparent pointer-events-none z-16" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-black/70 to-transparent pointer-events-none z-16" />

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-16 flex items-center gap-2 z-30">
          <button
            onClick={onChangeMedia}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-sm font-medium transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Солих
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Right side toolbar */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
          {EDITOR_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToolClick(tool.id);
                }}
                className={cn(
                  "group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                  isActive
                    ? "bg-white text-black shadow-lg scale-110"
                    : "bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute right-full mr-2 px-2 py-1 rounded-lg bg-black/80 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom panels per tool */}
        <div className="absolute bottom-20 inset-x-3 z-30">
          {/* Text tool panel */}
          {activeTool === "text" && (
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 space-y-3">
              {/* Row 1: Add text + style buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={addText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Текст нэмэх
                </button>
                <div className="flex gap-1">
                  {/* Background fill */}
                  <button
                    onClick={() => setTextBgStyle((p) => (p === "filled" ? "none" : "filled"))}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors",
                      textBgStyle === "filled" ? "bg-white text-black" : "bg-white/20 text-white"
                    )}
                    title="Фон"
                  >
                    <span className="bg-current/20 px-0.5 rounded-sm text-xs">A</span>
                  </button>
                  {/* Strikethrough */}
                  <button
                    onClick={() => setTextStrikethrough((p) => !p)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors",
                      textStrikethrough ? "bg-white text-black" : "bg-white/20 text-white"
                    )}
                    title="Зачёркнутый"
                  >
                    <span className="line-through">S</span>
                  </button>
                  {/* Outline */}
                  <button
                    onClick={() => setTextBgStyle((p) => (p === "outline" ? "none" : "outline"))}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors",
                      textBgStyle === "outline" ? "bg-white text-black" : "bg-white/20 text-white"
                    )}
                    title="Обведённый"
                  >
                    <span style={{ WebkitTextStroke: "1px currentColor", color: "transparent" }}>
                      A
                    </span>
                  </button>
                </div>
              </div>
              {/* Row 2: Font family */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {TEXT_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTextFontFamily(f.css)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                      textFontFamily === f.css
                        ? "bg-white text-black"
                        : "bg-white/15 text-white hover:bg-white/25"
                    )}
                    style={{ fontFamily: f.css }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Row 3: Font size */}
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-xs w-8 shrink-0">Aa</span>
                <input
                  type="range"
                  min={14}
                  max={64}
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(Number(e.target.value))}
                  className="flex-1 accent-white h-1"
                />
                <span className="text-white text-xs w-6 text-right">{textFontSize}</span>
              </div>
              {/* Row 4: Colors */}
              <div className="flex gap-1.5 justify-center">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-transform",
                      textColor === c ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sticker panel */}
          {activeTool === "sticker" && (
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto">
              {STICKER_PACKS.map((pack, pi) => (
                <div key={pi} className="flex gap-1.5 justify-center flex-wrap">
                  {pack.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addSticker(emoji)}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-colors hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Brightness panel */}
          {activeTool === "brightness" && (
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-white/60 shrink-0" />
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1 accent-white h-1"
                />
                <span className="text-white text-xs w-8 text-right">{brightness}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="absolute bottom-5 inset-x-4 z-30">
          <button
            onClick={() =>
              onContinue({
                texts: texts.map(
                  ({ id, text, x, y, color, fontSize, fontFamily, bgStyle, strikethrough }) => ({
                    id,
                    text,
                    x,
                    y,
                    color,
                    fontSize,
                    fontFamily,
                    bgStyle,
                    strikethrough,
                  })
                ),
                stickers: stickers.map(({ id, emoji, x, y, size }) => ({ id, emoji, x, y, size })),
                rotation,
                brightness,
              })
            }
            className="w-full h-12 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-xl"
          >
            Үргэлжлүүлэх
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Create Ad Modal
// ============================================

const STORY_PLAN_DURATIONS: Record<string, number> = {
  "1day": 24 * 60 * 60 * 1000,
  "2day": 48 * 60 * 60 * 1000,
};

function CreateAdModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<"upload" | "preview" | "payment" | "success">("upload");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [editorData, setEditorData] = React.useState<EditorData | null>(null);
  const [plan, setPlan] = React.useState("1day");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { mutateAsync: createStory } = useCreatead_stories();

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "success") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, step]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setStep("preview");
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStep("upload");
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user?.id) return;
    setIsSubmitting(true);

    try {
      // 1. Upload image — must finish before we can write the row.
      const { url, error: uploadError } = await uploadStoryImage(user.id, selectedFile);
      if (uploadError || !url) {
        toast.error(uploadError || "Зураг оруулахад алдаа гарлаа");
        setIsSubmitting(false);
        return;
      }

      // 2. Optimistic path: as soon as storage has the image, we
      //    (a) drop a provisional story into React Query's cache so
      //        the carousel shows it on the next render, and
      //    (b) flip the modal to "success" immediately — the user
      //        doesn't stare at a spinner for a second DB round-trip.
      //    The actual INSERT fires in the background below.
      const now = new Date().toISOString();
      const duration = STORY_PLAN_DURATIONS[plan] || STORY_PLAN_DURATIONS["1day"];
      const tempId = `pending-${crypto.randomUUID()}`;
      const optimistic: DbAdStory = {
        id: tempId,
        user_id: user.id,
        image_url: url,
        plan,
        status: "active",
        editor_data: editorData ?? null,
        views_count: 0,
        created_at: now,
        expires_at: new Date(Date.now() + duration).toISOString(),
        user: {
          id: user.id,
          first_name: user.user_metadata?.first_name ?? null,
          last_name: user.user_metadata?.last_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          company_name: user.user_metadata?.company_name ?? null,
          is_company: Boolean(user.user_metadata?.is_company),
        },
      };

      // Push into every cached ad_stories query (there's typically
      // just the one on the homepage, but this covers future callers).
      queryClient.setQueriesData<DbAdStory[]>({ queryKey: ["ad_stories"] }, (prev) => [
        optimistic,
        ...(prev ?? []),
      ]);

      setStep("success");
      setIsSubmitting(false);

      // 3. Background INSERT — not awaited. If it fails we roll back
      //    the optimistic row and show a toast; the user has already
      //    seen the success screen but the story won't actually exist.
      createStory({
        data: {
          user: { connect: { id: user.id } },
          image_url: url,
          plan,
          editor_data: editorData ? JSON.parse(JSON.stringify(editorData)) : undefined,
          expires_at: new Date(Date.now() + duration),
        },
      })
        .then(() => {
          // Let the next background refresh replace the provisional
          // row with the real one (same image, same user → same ring).
          queryClient.invalidateQueries({ queryKey: ["ad_stories"] });
        })
        .catch(() => {
          queryClient.setQueriesData<DbAdStory[]>({ queryKey: ["ad_stories"] }, (prev) =>
            (prev ?? []).filter((s) => s.id !== tempId)
          );
          toast.error("Stories-г хадгалж чадсангүй. Дахин оролдоно уу.");
        });
    } catch {
      toast.error("Алдаа гарлаа");
      setIsSubmitting(false);
    }
  };

  // Step: Success
  if (step === "success") {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-background rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-8 relative animate-in zoom-in-95 duration-300">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-accent/15 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-foreground text-background flex items-center justify-center">
              <svg
                className="w-9 h-9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold mb-1.5 tracking-tight">Амжилттай!</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Таны реклам stories-д нэмэгдлээ. Удахгүй хэрэглэгчдэд харагдана.
          </p>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
          >
            Хаах
          </button>
        </div>
      </div>
    );
  }

  // Step 1: upload
  if (step === "upload") {
    return (
      <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
        <div className="bg-background rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg leading-tight">Реклам нэмэх</h2>
                <p className="text-xs text-muted-foreground">Stories зар үүсгэх</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-foreground" />
              <div className="flex-1 h-1 rounded-full bg-muted" />
              <div className="flex-1 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Зураг</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Засах
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Төлбөр
              </span>
            </div>
          </div>

          {/* Dropzone */}
          <div className="px-6 pb-6">
            <button
              onClick={handleFileSelect}
              className="relative w-full aspect-3/4 rounded-2xl border-2 border-dashed border-border hover:border-foreground bg-muted/40 hover:bg-muted flex flex-col items-center justify-center gap-4 transition-all group overflow-hidden"
            >
              {/* Accent glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl bg-accent/20"
              />

              <div className="relative w-20 h-20 rounded-2xl bg-background ring-1 ring-border flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <ImageIcon className="h-8 w-8 text-foreground" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="relative text-center px-6">
                <p className="font-display font-semibold text-base">Зураг сонгох</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  9:16 хөрөг зураг · PNG, JPG
                </p>
              </div>
              <div className="relative flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium group-hover:shadow-lg transition-shadow">
                Файл сонгох
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Hints */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-foreground" />
                <span>24–48 цаг харагдана</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-foreground" />
                <span>Нэмэлт текст, эффектүүд</span>
              </div>
            </div>
          </div>
          <div className="h-[max(env(safe-area-inset-bottom),0.5rem)] md:h-0" />
        </div>
      </div>
    );
  }

  // Step 2: fullscreen preview with editing tools
  if (step === "preview" && previewUrl) {
    return (
      <StoryEditor
        previewUrl={previewUrl}
        onClose={onClose}
        onChangeMedia={handleRemoveFile}
        onContinue={(data) => {
          setEditorData(data);
          setStep("payment");
        }}
      />
    );
  }

  // Step 3: payment / plan selection
  const planPrice = plan === "2day" ? 9000 : 5000;

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-background rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("preview")}
              aria-label="Буцах"
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">Багц сонгох</h2>
              <p className="text-xs text-muted-foreground">Төлбөрөө баталгаажуулах</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-foreground" />
            <div className="flex-1 h-1 rounded-full bg-foreground" />
            <div className="flex-1 h-1 rounded-full bg-foreground" />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Зураг
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Засах
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">Төлбөр</span>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pb-5 space-y-2.5">
          {/* 1 day */}
          <label
            className={cn(
              "group relative flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all",
              plan === "1day"
                ? "bg-foreground text-background"
                : "bg-card ring-1 ring-border hover:ring-foreground"
            )}
          >
            <input
              type="radio"
              name="plan"
              checked={plan === "1day"}
              onChange={() => setPlan("1day")}
              className="sr-only"
            />
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                plan === "1day" ? "bg-background/10" : "bg-muted"
              )}
            >
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-base leading-tight">1 хоног</p>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  plan === "1day" ? "text-background/70" : "text-muted-foreground"
                )}
              >
                24 цагийн турш харагдана
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-base tabular">5,000₮</p>
            </div>
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                plan === "1day" ? "border-background bg-background" : "border-border"
              )}
            >
              {plan === "1day" && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-foreground" fill="none">
                  <path
                    d="M2.5 6.5L5 9l4.5-5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </label>

          {/* 2 days — popular */}
          <label
            className={cn(
              "group relative flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all",
              plan === "2day"
                ? "bg-foreground text-background"
                : "bg-card ring-1 ring-border hover:ring-foreground"
            )}
          >
            {/* Popular badge */}
            <span
              className={cn(
                "absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                plan === "2day"
                  ? "bg-accent text-accent-foreground"
                  : "bg-accent text-accent-foreground"
              )}
            >
              Хэмнэлттэй
            </span>
            <input
              type="radio"
              name="plan"
              checked={plan === "2day"}
              onChange={() => setPlan("2day")}
              className="sr-only"
            />
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                plan === "2day" ? "bg-background/10" : "bg-muted"
              )}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-base leading-tight">2 хоног</p>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  plan === "2day" ? "text-background/70" : "text-muted-foreground"
                )}
              >
                48 цагийн турш харагдана
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-base tabular">9,000₮</p>
              <p
                className={cn(
                  "text-[10px] tabular",
                  plan === "2day" ? "text-background/60" : "text-muted-foreground"
                )}
              >
                <span className="line-through">10,000₮</span>
              </p>
            </div>
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                plan === "2day" ? "border-background bg-background" : "border-border"
              )}
            >
              {plan === "2day" && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-foreground" fill="none">
                  <path
                    d="M2.5 6.5L5 9l4.5-5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </label>
        </div>

        {/* Footer: total + CTA */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Нийт дүн</span>
            <span className="font-display font-bold text-xl tabular">
              {planPrice.toLocaleString("mn-MN")}₮
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                Оруулж байна…
              </>
            ) : (
              <>
                Төлбөр төлөх
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Төлбөр амжилттай төлөгдсөний дараа stories-д гарна
          </p>
        </div>
        <div className="h-[max(env(safe-area-inset-bottom),0)] md:h-0" />
      </div>
    </div>
  );
}

// ============================================
// AdStories — горизонтальная лента кружочков
// ============================================

interface AdStoriesProps {
  /**
   * SSR-seeded list. When provided, React Query treats the query as
   * already fresh and skips the mount-time network hop. Stories then
   * show up in the very first paint instead of arriving 1-2s after
   * hydration (one round-trip to Seoul from MN).
   */
  initialStories?: DbAdStory[];
}

export function AdStories({ initialStories }: AdStoriesProps = {}) {
  const { isAuthenticated } = useAuth();

  // OPTIMIZATION: Round date to 5-min intervals for stable query key.
  // Value changes at next re-render after a 5-min boundary (not on a timer).
  const storiesDateThreshold = React.useMemo(() => {
    const fiveMin = 5 * 60 * 1000;
    return new Date(Math.floor(Date.now() / fiveMin) * fiveMin).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(Date.now() / (5 * 60 * 1000))]);

  const { data: rawStoriesData, isLoading } = useFindManyad_stories(
    {
      where: {
        status: "active",
        expires_at: { gt: storiesDateThreshold },
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            company_name: true,
            is_company: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    },
    {
      staleTime: 30 * 1000,
      // Seed from SSR so the ring doesn't pop in after a round-trip.
      // React Query still refreshes in the background after staleTime.
      // Cast is needed because the ZenStack-generated hook's initialData
      // type is the full findMany payload including defaults, which our
      // narrower DbAdStory[] shape satisfies structurally.
      initialData: initialStories as never,
    }
  );
  const rawStories = (rawStoriesData || []) as unknown as DbAdStory[];

  const [viewedIds, setViewedIds] = React.useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const stored = localStorage.getItem("ad_stories_viewed");
      if (!stored) return new Set<string>();
      const parsed: { ids: string[]; ts: number } = JSON.parse(stored);
      // Expire after 7 days
      if (Date.now() - parsed.ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem("ad_stories_viewed");
        return new Set<string>();
      }
      return new Set(parsed.ids);
    } catch {
      return new Set<string>();
    }
  });
  const [openGroupIndex, setOpenGroupIndex] = React.useState<number | null>(null);

  const groups = React.useMemo(() => groupStoriesByUser(rawStories), [rawStories]);

  const handleStoryViewed = React.useCallback((id: string) => {
    setViewedIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(
          "ad_stories_viewed",
          JSON.stringify({ ids: [...next], ts: Date.now() })
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  const handleAddStory = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <>
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 relative">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 md:w-10 bg-linear-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 md:w-10 bg-linear-to-l from-background to-transparent z-10" />
        <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide py-1">
          {/* Add Story button */}
          <button
            onClick={handleAddStory}
            className="flex flex-col items-center gap-1.5 w-17 md:w-19 shrink-0 group"
          >
            <div className="w-15.5 h-15.5 md:w-17 md:h-17 rounded-full border border-dashed border-muted-foreground/40 group-hover:border-blue-500 flex items-center justify-center group-hover:bg-blue-500/5 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-[10px] md:text-xs text-muted-foreground">Реклам авах</span>
          </button>

          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 w-17 md:w-19 shrink-0 animate-pulse"
                >
                  <div className="w-15.5 h-15.5 md:w-17 md:h-17 rounded-full bg-muted" />
                  <div className="h-2.5 w-12 rounded-full bg-muted mt-0.5" />
                </div>
              ))
            : groups.map((group, index) => (
                <StoryCircle
                  key={group.userId}
                  group={group}
                  viewedIds={viewedIds}
                  onClick={() => setOpenGroupIndex(index)}
                  // First few circles are above the fold on every viewport;
                  // eager-loading them prevents a pop-in when the page paints.
                  priority={index < 4}
                />
              ))}
        </div>
      </div>

      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        title="Зар нэмэхийн тулд нэвтэрнэ үү"
        description="Шинэ зар нэмэхийн тулд эхлээд нэвтрэх шаардлагатай."
        icon={Plus}
        onSuccess={() => setShowCreateModal(true)}
      />

      {showCreateModal && <CreateAdModal onClose={() => setShowCreateModal(false)} />}

      {openGroupIndex !== null && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={openGroupIndex}
          initialSlideIndex={(() => {
            const g = groups[openGroupIndex];
            const idx = g.stories.findIndex((s) => !viewedIds.has(s.id));
            return idx >= 0 ? idx : 0;
          })()}
          onClose={() => setOpenGroupIndex(null)}
          onViewed={handleStoryViewed}
        />
      )}
    </>
  );
}
