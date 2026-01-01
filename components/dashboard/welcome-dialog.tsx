"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/i18n-provider";

interface WelcomeDialogProps {
  username?: string | null;
}

export function WelcomeDialog({ username }: WelcomeDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>("Bill Bridge");

  useEffect(() => {
    // Fetch company name from settings
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const name =
          typeof data.companyName === "string" && data.companyName.trim() !== ""
            ? data.companyName
            : "Bill Bridge";
        setCompanyName(name);
      } catch {
        // ignore, keep default
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!username) return;

    const storageKey = `welcome_shown_${username}`;
    try {
      const alreadyShown = window.localStorage.getItem(storageKey);
      if (!alreadyShown) {
        setOpen(true);
        window.localStorage.setItem(storageKey, "1");
      }
    } catch {
      // localStorage might be unavailable; fail silently
      setOpen(true);
    }
  }, [username]);

  if (!username) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {t("welcomeDialog.title").replace("{companyName}", companyName)}
          </DialogTitle>
          <DialogDescription>
            {t("welcomeDialog.description")
              .replace("{companyName}", companyName)
              .replace("{username}", username)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex justify-end">
          <Button onClick={() => setOpen(false)}>{t("welcomeDialog.continue")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
