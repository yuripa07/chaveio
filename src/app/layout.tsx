import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "@/contexts/locale-context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chaveio",
  description: "Bracket predictions for your team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={geist.className}>
      <body className="min-h-screen bg-white text-zinc-900">
        <LocaleProvider>
          {children}
          <LocaleSwitcher />
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
