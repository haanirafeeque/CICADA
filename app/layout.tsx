import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  title: "CICADA · FISAT",
  description: "A puzzle hunt. Keep your answers.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "CICADA · FISAT",
    description: "SOMETHING IS STIRRING · BENEATH FISAT",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Something is stirring beneath FISAT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CICADA · FISAT",
    description: "SOMETHING IS STIRRING · BENEATH FISAT",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
