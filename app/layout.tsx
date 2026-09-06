import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIANG WENXIN — Portfolio",
  description: "Research, Strategy, Experience and Visual Systems. Selected work by Liang Wenxin.",
  openGraph: {
    title: "LIANG WENXIN — Portfolio",
    description: "Research, Strategy, Experience and Visual Systems. Selected work by Liang Wenxin.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LIANG WENXIN — Portfolio",
    description: "Research, Strategy, Experience and Visual Systems. Selected work by Liang Wenxin.",
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
