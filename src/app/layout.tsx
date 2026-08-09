import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autonomous Interviewer — Adaptive Technical Assessment",
  description: "Adaptive technical interview platform powered by Breeth Graph Memory and AI Cohort Curriculum",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="app-wrapper">{children}</body>
    </html>
  );
}
