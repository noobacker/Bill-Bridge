"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n/i18n-provider";

interface Props {
  children: ReactNode;
}

export default function I18nRoot({ children }: Props) {
  return <I18nProvider>{children}</I18nProvider>;
}
