import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { BirthDataProvider } from "@/lib/context/birth-data-context";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Mystic Council",
  description: "Consult the council of mystical traditions",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable} ${cormorantGaramond.variable} h-full dark`}>
      <body className="min-h-full antialiased">
        <BirthDataProvider>
          {children}
        </BirthDataProvider>
      </body>
    </html>
  );
}
