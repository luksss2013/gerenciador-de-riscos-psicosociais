import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NR-1 Copsoq · Gestão de Riscos Psicossociais",
  description:
    "Plataforma SaaS multi-tenant para gerenciamento de Riscos Ocupacionais Psicossociais conforme NR-1, utilizando o instrumento canônico COPSOQ II-BR.",
  keywords: ["NR-1", "COPSOQ II-BR", "FRPRT", "Riscos Psicossociais", "PGR", "SST", "LGPD"],
  authors: [{ name: "NR-1 Copsoq Platform" }],
  applicationName: "NR-1 Copsoq",
  generator: "Next.js",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e9" },
    { media: "(prefers-color-scheme: dark)", color: "#2f4a43" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "NR-1 Copsoq · Gestão de Riscos Psicossociais",
    description:
      "Gerencie Riscos Psicossociais conforme NR-1 com o instrumento canônico COPSOQ II-BR.",
    siteName: "NR-1 Copsoq",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plexMono.variable} ${sourceSerif.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
