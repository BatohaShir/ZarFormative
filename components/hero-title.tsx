"use client";

import * as React from "react";

interface HeroTitleProps {
  line1: string;
  line2: string;
}

const TYPE_SPEED = 55; // ms per character
const LINE_PAUSE = 350; // ms between lines

export function HeroTitle({ line1, line2 }: HeroTitleProps) {
  const [typed1, setTyped1] = React.useState("");
  const [typed2, setTyped2] = React.useState("");
  const [phase, setPhase] = React.useState<"line1" | "pause" | "line2" | "done">("line1");

  // Respect reduced motion — skip animation
  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTyped1(line1);
      setTyped2(line2);
      setPhase("done");
    }
  }, [line1, line2]);

  React.useEffect(() => {
    if (phase === "line1") {
      if (typed1.length < line1.length) {
        const id = setTimeout(() => setTyped1(line1.slice(0, typed1.length + 1)), TYPE_SPEED);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("line2"), LINE_PAUSE);
      return () => clearTimeout(id);
    }
    if (phase === "line2") {
      if (typed2.length < line2.length) {
        const id = setTimeout(() => setTyped2(line2.slice(0, typed2.length + 1)), TYPE_SPEED);
        return () => clearTimeout(id);
      }
      setPhase("done");
      return;
    }
    return;
  }, [phase, typed1, typed2, line1, line2]);

  const caretOn1 = phase === "line1";
  const caretOn2 = phase === "line2";
  const caretDone = phase === "done";

  return (
    <h1 className="font-display font-bold tracking-tight text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05]">
      {/* Reserve layout space so the bar below doesn't jump */}
      <span className="sr-only">
        {line1} {line2}
      </span>
      <span aria-hidden className="block">
        <span>{typed1}</span>
        {caretOn1 && <Caret />}
        {/* keep min-height for line1 while empty */}
        {typed1.length === 0 && <span className="invisible">{line1}</span>}
      </span>
      <span aria-hidden className="block text-muted-foreground">
        <span>{typed2}</span>
        {(caretOn2 || caretDone) && <Caret blink={caretDone} />}
        {typed2.length === 0 && phase !== "line2" && <span className="invisible">{line2}</span>}
      </span>
    </h1>
  );
}

function Caret({ blink = false }: { blink?: boolean }) {
  return (
    <span
      className={
        "inline-block w-[0.08em] h-[0.9em] -mb-[0.05em] ml-1 align-middle bg-current " +
        (blink ? "animate-caret-blink" : "")
      }
    />
  );
}
