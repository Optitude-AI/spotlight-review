import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotlight Review — Assistive Headshot Evaluator",
  description:
    "Structured, transparent feedback on actors' headshot portraits for photographers, actors and casting. Assistive only — final judgement rests with the human.",
  keywords: [
    "headshot",
    "casting",
    "actor portfolio",
    "portrait review",
    "photography feedback",
  ],
  authors: [{ name: "Spotlight Review" }],
  openGraph: {
    title: "Spotlight Review — Assistive Headshot Evaluator",
    description:
      "Structured feedback on actors' headshots. Assistive aesthetic + casting analysis, never a verdict on a person.",
    type: "website",
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
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
