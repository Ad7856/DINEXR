import type { Metadata, Viewport } from "next";
import { Caveat, Inter } from "next/font/google";
import "./globals.css";

const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "DINEXR", template: "%s · DINEXR" },
  description: "Scan. See. Experience. Order.",
};
export const viewport: Viewport = { themeColor: "#17181a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caveat.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
