import type { ReactNode } from "react";
import { cn } from "../utils/cn";

interface Props {
  children: ReactNode;
  className?: string;
  /** adds the soft outer accent glow — reserve for the single active/hero surface */
  glow?: boolean;
  id?: string;
}

/** The one card surface in the app — translucent glass over the dark scene. */
export function GlassCard({ children, className, glow, id }: Props) {
  return (
    <div id={id} className={cn("glass rounded-[20px]", glow && "glass-glow", className)}>
      {children}
    </div>
  );
}
