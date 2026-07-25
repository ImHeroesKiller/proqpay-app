"use client";

import Image from "next/image";
import { motion } from "framer-motion";
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
  | "pointing"
  | "wave"
  | "listening"
  | "talking"
  | "typing";

const AVATAR_SRC: Record<string, string> = {
  wave: "/illustrations/avatar/wave.webp",
  idle: "/illustrations/avatar/idle.webp",
  smile: "/illustrations/avatar/smile.webp",
  pointing: "/illustrations/avatar/pointing.webp",
  "point-left": "/illustrations/avatar/pointing.webp",
  "point-right": "/illustrations/avatar/pointing.webp",
  thinking: "/illustrations/avatar/thinking.webp",
  typing: "/illustrations/avatar/thinking.webp",
  listening: "/illustrations/avatar/thinking.webp",
  talking: "/illustrations/avatar/smile.webp",
  concern: "/illustrations/avatar/concern.webp",
  serious: "/illustrations/avatar/concern.webp",
  celebrate: "/illustrations/avatar/celebrate.webp",
  blink: "/illustrations/avatar/idle.webp",
};

function resolveSrc(state: AvatarState): string {
  return AVATAR_SRC[state] ?? AVATAR_SRC.idle;
}

export function ProQAvatar({
  state = "wave",
  size = 160,
  className,
  showParticles = false,
  float = true,
}: {
  state?: AvatarState;
  size?: number;
  className?: string;
  showParticles?: boolean;
  float?: boolean;
}) {
  const src = resolveSrc(state);
  const isCelebrate = state === "celebrate";
  const isConcern = state === "concern" || state === "serious";
  const isPositive =
    state === "smile" || state === "celebrate" || state === "wave";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-[8%] rounded-full blur-2xl transition-colors duration-500",
          isConcern && "bg-red-400/20",
          isPositive && "bg-sky-400/25",
          !isConcern && !isPositive && "bg-orange/15",
        )}
      />

      {showParticles && isPositive ? (
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/3 h-1.5 w-1.5 rounded-full bg-emerald-400"
              animate={{
                x: Math.cos((i / 4) * Math.PI * 2) * (size * 0.35),
                y: Math.sin((i / 4) * Math.PI * 2) * (size * 0.28),
                opacity: [0.8, 0],
                scale: [1, 0.4],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ) : null}

      {isCelebrate ? (
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {["#f28c28", "#0b3a6e", "#10b981", "#fbbf24"].map((c, i) => (
            <motion.span
              key={c + i}
              className="absolute left-1/2 top-2 h-2 w-1.5 rounded-sm"
              style={{ background: c }}
              animate={{
                y: [0, size * 0.55],
                x: [(i - 1.5) * 10, (i - 1.5) * 22],
                rotate: [0, 160 + i * 30],
                opacity: [1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.12,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ) : null}

      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={
          float
            ? {
                opacity: 1,
                y: [0, -6, 0],
                scale: 1,
              }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={
          float
            ? {
                opacity: { duration: 0.45 },
                scale: { duration: 0.45 },
                y: {
                  duration: 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
            : { duration: 0.4 }
        }
      >
        <motion.div
          animate={
            state === "wave"
              ? { rotate: [0, -3, 3, 0] }
              : state === "thinking"
                ? { scale: [1, 1.02, 1] }
                : { rotate: 0 }
          }
          transition={{
            duration: state === "wave" ? 2.4 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: size, height: size }}
          className="relative drop-shadow-xl"
        >
          <Image
            src={src}
            alt=""
            fill
            sizes={`${size}px`}
            className="object-contain object-bottom"
            priority={size >= 160}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
