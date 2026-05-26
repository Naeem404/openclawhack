import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-rex-orange border-rex-orange/40",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success:
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        warning:
          "border-amber-400/40 bg-amber-400/15 text-amber-300",
        danger:
          "border-rose-500/40 bg-rose-500/15 text-rose-300",
        cyan: "border-cyan-400/40 bg-cyan-400/15 text-cyan-300",
        purple:
          "border-violet-400/40 bg-violet-400/15 text-violet-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
