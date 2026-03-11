import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Avatar } from "./Avatar.vue";
export { default as AvatarFallback } from "./AvatarFallback.vue";
export { default as AvatarImage } from "./AvatarImage.vue";

export const avatarVariant = cva(
  "inline-flex items-center justify-center text-foreground select-none shrink-0 bg-muted overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-10 w-10",
        base: "h-16 w-16",
        lg: "h-32 w-32",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-md",
      },
    },
  },
);

export type AvatarVariants = VariantProps<typeof avatarVariant>;
