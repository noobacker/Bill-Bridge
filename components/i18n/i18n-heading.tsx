"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

interface I18nHeadingProps {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  titleKey: string;
  className?: string;
}

export function I18nHeading({ as = "h1", titleKey, className }: I18nHeadingProps) {
  const { t } = useI18n();
  const Tag = as as any;
  return <Tag className={cn(className)}>{t(titleKey)}</Tag>;
}
