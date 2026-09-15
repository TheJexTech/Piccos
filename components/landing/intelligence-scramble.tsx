"use client";

import { useEffect, useState } from "react";

// The word this component alternates between — kept as constants so the
// scramble-width reservation below and the animation logic can't drift out
// of sync with each other.
const WORD_FULL = "Intelligence.";
const WORD_SHORT = "AI";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ013478#";

const HOLD_FULL_MS = 2000;
const HOLD_SHORT_MS = 2000;
const TRANSITION_MS = 500;
const FRAME_MS = 40;

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

// Interpolates character-count between `from`/`to` and progressively
// "locks in" real characters of `to` from the left, so the effect reads as
// letters being decoded/reconstructed rather than a random flicker.
function scrambleFrame(from: string, to: string, progress: number) {
  const length = Math.max(1, Math.round(from.length + (to.length - from.length) * progress));
  const resolvedCount = Math.floor(progress * progress * to.length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += i < to.length && i < resolvedCount ? to[i] : randomChar();
  }
  return out;
}

export function IntelligenceScramble() {
  const [text, setText] = useState(WORD_FULL);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function runTransition(from: string, to: string, onDone: () => void) {
      const steps = Math.round(TRANSITION_MS / FRAME_MS);
      let step = 0;
      const frame = () => {
        if (cancelled) return;
        step += 1;
        const progress = step / steps;
        if (progress >= 1) {
          setText(to);
          onDone();
          return;
        }
        setText(scrambleFrame(from, to, progress));
        timeoutId = setTimeout(frame, FRAME_MS);
      };
      frame();
    }

    function loop() {
      if (cancelled) return;
      setText(WORD_FULL);
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        runTransition(WORD_FULL, WORD_SHORT, () => {
          if (cancelled) return;
          timeoutId = setTimeout(() => {
            if (cancelled) return;
            runTransition(WORD_SHORT, WORD_FULL, () => {
              if (cancelled) return;
              timeoutId = setTimeout(loop, HOLD_FULL_MS);
            });
          }, HOLD_SHORT_MS);
        });
      }, HOLD_FULL_MS);
    }

    loop();

    // A user can toggle the OS-level reduced-motion setting while the page
    // is open — stop mid-animation and settle back on the static word.
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        cancelled = true;
        clearTimeout(timeoutId);
        setText(WORD_FULL);
      }
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    // Fixed to the width of the longer word ("Intelligence." = 13
    // characters) so switching to "AI" never reflows the headline,
    // buttons, or hero height — only the text inside this box changes,
    // never the box itself. Tailwind needs this as a literal class (not a
    // template string) to generate it at build time.
    <span className="inline-block w-[13ch] text-left text-landing-accent" aria-label={WORD_FULL}>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
