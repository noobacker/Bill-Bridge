"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { Language } from "@/components/i18n/i18n-provider";

export function LanguageSettings() {
  const { t } = useI18n();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.systemConfiguration")}</CardTitle>
        <CardDescription>{t("settings.systemConfigurationDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label>{t("settings.language.label")}</Label>
          <div className="flex items-center p-2 border rounded-md bg-muted/50">
            {t("settings.language.english")} (Default)
          </div>
          <p className="text-sm text-muted-foreground">
            Language selection is not configurable in this version.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
