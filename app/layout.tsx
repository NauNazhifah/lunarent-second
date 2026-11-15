import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyLunaList — Personal Reading Library",
  description:
    "A warm, vintage shelf for your novels, manhwa, manga, and comics. Track progress, rate, and keep favourites close.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
