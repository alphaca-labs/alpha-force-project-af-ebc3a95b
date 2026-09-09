import type { CSSProperties } from "react";
import { cn } from "@repo/design-system/lib/utils";

export type MaterialSymbolProps = {
  /** Material Symbols Outlined icon name, e.g. "dashboard", "group". */
  name: string;
  /** Render the filled variant (FILL 1). */
  filled?: boolean;
  /** Optical size in px (maps to font-size). Default 20. */
  size?: number;
  /** Weight axis (wght 100..700). */
  weight?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Material Symbols Outlined icon.
 *
 * This component only emits the `.material-symbols-outlined` class — the
 * consuming app MUST load the Material Symbols web font (via a Google Fonts
 * `<link>`) and define the base `.material-symbols-outlined` / `.ms-fill`
 * CSS. See `apps/admin/app/layout.tsx` + `apps/admin/app/styles.css` for the
 * reference wiring. Apps that follow the lucide-react convention should keep
 * using lucide; this primitive is opt-in for designs built on Material Symbols.
 */
export function MaterialSymbol({
  name,
  filled = false,
  size = 20,
  weight,
  className,
  style,
}: MaterialSymbolProps) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined", filled && "ms-fill", className)}
      style={{
        fontSize: size,
        ...(weight ? { fontVariationSettings: `'wght' ${weight}` } : null),
        ...style,
      }}
    >
      {name}
    </span>
  );
}
