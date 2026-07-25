"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type AvatarState =
  | "idle"
  | "blink"
  | "smile"
  | "thinking"
  | "concern"
  | "serious"
  | "celebrate"
  | "point-left"
  | "point-right"
  | "wave"
  | "listening"
  | "talking"
  | "typing";

const faceByState: Record<
  AvatarState,
  { mouth: string; brow: number; eyeScale: number; cheek: number }
> = {
  idle: { mouth: "M 38 58 Q 50 62 62 58", brow: 0, eyeScale: 1, cheek: 0 },
  blink: { mouth: "M 38 58 Q 50 60 62 58", brow: 0, eyeScale: 0.12, cheek: 0 },
  smile: { mouth: "M 36 56 Q 50 70 64 56", brow: -1, eyeScale: 1, cheek: 0.8 },
  thinking: {
    mouth: "M 40 60 L 60 60",
    brow: 2,
    eyeScale: 1,
    cheek: 0,
  },
  concern: {
    mouth: "M 38 62 Q 50 56 62 62",
    brow: 3,
    eyeScale: 1,
    cheek: 0,
  },
  serious: {
    mouth: "M 40 60 L 60 60",
    brow: 4,
    eyeScale: 0.9,
    cheek: 0,
  },
  celebrate: {
    mouth: "M 34 54 Q 50 74 66 54",
    brow: -2,
    eyeScale: 1,
    cheek: 1,
  },
  "point-left": {
    mouth: "M 38 58 Q 50 64 62 58",
    brow: 0,
    eyeScale: 1,
    cheek: 0.3,
  },
  "point-right": {
    mouth: "M 38 58 Q 50 64 62 58",
    brow: 0,
    eyeScale: 1,
    cheek: 0.3,
  },
  wave: { mouth: "M 36 56 Q 50 68 64 56", brow: -1, eyeScale: 1, cheek: 0.6 },
  listening: {
    mouth: "M 42 60 Q 50 62 58 60",
    brow: 0,
    eyeScale: 1.05,
    cheek: 0,
  },
  talking: {
    mouth: "M 42 58 Q 50 66 58 58",
    brow: 0,
    eyeScale: 1,
    cheek: 0.2,
  },
  typing: {
    mouth: "M 40 60 L 60 60",
    brow: 1,
    eyeScale: 1,
    cheek: 0,
  },
};

export function ProQAvatar({
  state = "idle",
  size = 120,
  className,
  showParticles = false,
}: {
  state?: AvatarState;
  size?: number;
  className?: string;
  showParticles?: boolean;
}) {
  const face = faceByState[state] ?? faceByState.idle;
  const isCelebrate = state === "celebrate";
  const isConcern = state === "concern" || state === "serious";
  const isPositive = state === "smile" || state === "celebrate" || state === "wave";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Ambient glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-2xl transition-colors duration-500",
          isConcern && "bg-red-400/25",
          isPositive && "bg-emerald-400/20",
          !isConcern && !isPositive && "bg-orange/20",
        )}
      />

      <AnimatePresence>
        {showParticles && isPositive ? (
          <motion.div
            key="particles"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * (size * 0.45),
                  y: Math.sin((i / 6) * Math.PI * 2) * (size * 0.45),
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        ) : null}
        {isCelebrate ? (
          <motion.div
            key="confetti"
            className="pointer-events-none absolute inset-0 overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {["#f28c28", "#0b3a6e", "#10b981", "#fbbf24", "#fff"].map((c, i) => (
              <motion.span
                key={c + i}
                className="absolute left-1/2 top-0 h-2 w-1.5 rounded-sm"
                style={{ background: c }}
                initial={{ y: 10, x: (i - 2) * 8, rotate: 0, opacity: 1 }}
                animate={{
                  y: size * 0.9,
                  x: (i - 2) * 18,
                  rotate: 180 + i * 40,
                  opacity: 0,
                }}
                transition={{ duration: 1.4, ease: "easeOut", delay: i * 0.06 }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative drop-shadow-lg"
        animate={{
          y: state === "thinking" ? [0, -2, 0] : 0,
          rotate: state === "wave" ? [0, -6, 6, 0] : 0,
        }}
        transition={{
          duration: state === "wave" ? 0.8 : 2.4,
          repeat: state === "thinking" || state === "wave" ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <defs>
          <linearGradient id="proqBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a3a5c" />
            <stop offset="55%" stopColor="#0b1f33" />
            <stop offset="100%" stopColor="#0b3a6e" />
          </linearGradient>
          <linearGradient id="proqFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe8d2" />
            <stop offset="100%" stopColor="#f5c9a8" />
          </linearGradient>
          <linearGradient id="proqAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f28c28" />
            <stop offset="100%" stopColor="#ffb35c" />
          </linearGradient>
        </defs>

        {/* Soft platform */}
        <ellipse cx="50" cy="92" rx="28" ry="5" fill="rgba(11,31,51,0.12)" />

        {/* Body / torso capsule */}
        <path
          d="M28 62 C28 48 36 42 50 42 C64 42 72 48 72 62 L70 88 C70 94 30 94 30 88 Z"
          fill="url(#proqBody)"
        />
        <path
          d="M36 58 C40 52 60 52 64 58"
          fill="none"
          stroke="url(#proqAccent)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="50" cy="36" r="22" fill="url(#proqFace)" />
        {/* Hair / cap */}
        <path
          d="M30 34 C32 18 68 18 70 34 C62 28 38 28 30 34 Z"
          fill="#0b1f33"
        />
        <circle cx="50" cy="18" r="4" fill="#f28c28" />

        {/* Brows */}
        <path
          d={`M36 ${32 + face.brow} Q40 ${30 + face.brow} 44 ${32 + face.brow}`}
          stroke="#0b1f33"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M56 ${32 + face.brow} Q60 ${30 + face.brow} 64 ${32 + face.brow}`}
          stroke="#0b1f33"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        <ellipse
          cx="40"
          cy="38"
          rx="3.2"
          ry={3.2 * face.eyeScale}
          fill="#0b1f33"
        />
        <ellipse
          cx="60"
          cy="38"
          rx="3.2"
          ry={3.2 * face.eyeScale}
          fill="#0b1f33"
        />
        {face.eyeScale > 0.5 ? (
          <>
            <circle cx="41" cy="37" r="0.9" fill="#fff" />
            <circle cx="61" cy="37" r="0.9" fill="#fff" />
          </>
        ) : null}

        {/* Cheeks */}
        {face.cheek > 0 ? (
          <>
            <circle
              cx="32"
              cy="46"
              r={3 + face.cheek}
              fill={`rgba(242,140,40,${0.25 * face.cheek})`}
            />
            <circle
              cx="68"
              cy="46"
              r={3 + face.cheek}
              fill={`rgba(242,140,40,${0.25 * face.cheek})`}
            />
          </>
        ) : null}

        {/* Mouth */}
        <path
          d={face.mouth}
          stroke="#0b1f33"
          strokeWidth="2"
          fill={
            state === "smile" || state === "celebrate" || state === "wave"
              ? "rgba(11,31,51,0.08)"
              : "none"
          }
          strokeLinecap="round"
        />

        {/* Thinking bubble */}
        {state === "thinking" || state === "typing" ? (
          <g>
            <circle cx="78" cy="22" r="3" fill="#f28c28" opacity="0.85" />
            <circle cx="84" cy="16" r="4.5" fill="#f28c28" opacity="0.7" />
            <circle cx="90" cy="8" r="6" fill="#f28c28" opacity="0.55" />
          </g>
        ) : null}

        {/* Point arms simplified */}
        {state === "point-left" ? (
          <path
            d="M30 70 L14 62"
            stroke="#0b1f33"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}
        {state === "point-right" ? (
          <path
            d="M70 70 L86 62"
            stroke="#0b1f33"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}
      </motion.svg>
    </div>
  );
}
