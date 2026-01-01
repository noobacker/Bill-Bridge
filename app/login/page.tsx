"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModeToggle } from "@/components/mode-toggle";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState("Bill Bridge");
  const [logoUrl, setLogoUrl] = useState<string>("/images/default_logo.png");
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const ensureVisible = (el: HTMLElement | null) => {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (result?.error) {
        setError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Fetch company name from settings to display on login
  useEffect(() => {
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
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      } catch {
        // ignore, fallback already set
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="h-screen overflow-y-auto md:overflow-hidden flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted/40">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md">
        <Card className="border border-border/60 shadow-xl backdrop-blur-md bg-background/70">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto h-16 w-16 relative ring-[rgb(244,88,1)] overflow-hidden">
              <Image
                src={logoUrl}
                alt="Bill Bridge Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight">
              {companyName}
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the management system
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="focus-visible:ring-[rgb(244,88,1)]"
                  ref={usernameRef}
                  onFocus={() =>
                    ensureVisible(usernameRef.current as HTMLElement)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 focus-visible:ring-[rgb(244,88,1)]"
                    ref={passwordRef}
                    onFocus={() =>
                      ensureVisible(passwordRef.current as HTMLElement)
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-[rgb(244,88,1)] hover:bg-[rgb(244,70,1)] text-white shadow-md"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <div className="mt-6 text-xs text-muted-foreground text-center">
          Designed, Developed, and maintained by{" "}
          <span className="font-semibold" style={{ color: "rgb(244,88,1)" }}>
            Noobacker
          </span>
        </div>
      </div>
    </div>
  );
}
