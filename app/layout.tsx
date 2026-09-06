import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "梁文馨 — Spatial / Visual Designer",
  description:
    "梁文馨的作品集，2018—2026。区域研究与数据可视化、空间产品与体验设计、街区品牌设计、学术研究与产品应用。",
  openGraph: {
    title: "梁文馨 — Spatial / Visual Designer",
    description:
      "连接研究、空间与视觉叙事。作品选集，2018—2026。",
    type: "website",
    images: [{ url: "/portfolio/taihu-mountain.png", width: 3072, height: 1526, alt: "梁文馨作品集 · 山水主题街区概念研究" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "梁文馨 — Spatial / Visual Designer",
    description: "研究、空间与叙事 — 2018—2026",
    images: ["/portfolio/taihu-mountain.png"],
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
