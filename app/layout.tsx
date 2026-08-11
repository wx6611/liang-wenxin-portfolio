import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Name — Creative / Visual Designer",
  description:
    "Independent creative and visual designer working across identity, image and digital experience.",
  openGraph: {
    title: "Your Name — Creative / Visual Designer",
    description:
      "Selected identity, editorial and digital work by an independent creative designer.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Your Name portfolio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Name — Creative / Visual Designer",
    description: "Selected work — 2026",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
