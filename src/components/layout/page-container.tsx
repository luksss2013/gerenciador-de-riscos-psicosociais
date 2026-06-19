import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  default: "max-w-7xl",
  narrow: "max-w-5xl",
  wide: "max-w-screen-2xl",
  full: "max-w-none",
} as const;

type ContainerSize = keyof typeof SIZE_CLASSES;

interface PageContainerProps {
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function PageContainer({
  size = "default",
  className,
  children,
  as: Tag = "div",
}: PageContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-6",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
