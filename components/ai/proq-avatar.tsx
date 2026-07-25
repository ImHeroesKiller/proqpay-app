import Image from "next/image";
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

const AVATAR_SRC = "/illustrations/avatar/idle.webp";

export function ProQAvatar({
  size = 160,
  className,
}: {
  state?: AvatarState;
  size?: number;
  className?: string;
  showParticles?: boolean;
  float?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-lg",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={AVATAR_SRC}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-top"
        priority={size >= 160}
      />
    </div>
  );
}
