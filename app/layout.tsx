import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { getI18n } from "@/lib/i18n";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

// The document language follows the browser, read on every request like the pages below it.
export const instant = false;

export const metadata: Metadata = {
  title: "Flightlog",
  description: "Personal flight history",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${hanken.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
