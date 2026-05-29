import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "prompt-guard — LLM Prompt Security Linter",
  description: "Detect prompt injection, jailbreaks, system prompt leaks, obfuscation, and goal hijacking before they reach your LLM. 100% offline, no API keys required.",
  keywords: ["prompt-guard", "LLM security", "prompt injection", "jailbreak detection", "AI safety", "prompt scanner"],
  authors: [{ name: "prompt-guard" }],
  icons: {
    icon: "/prompt-guard-logo.png",
  },
  openGraph: {
    title: "prompt-guard — LLM Prompt Security Linter",
    description: "Protect your LLM prompts before they reach the model",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "prompt-guard — LLM Prompt Security Linter",
    description: "Protect your LLM prompts before they reach the model",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
