import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

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

export const metadata: Metadata = {
  title: "NR-1 Copsoq · Gestão de Riscos Psicossociais",
  description:
    "Plataforma SaaS multi-tenant para gerenciamento de Riscos Ocupacionais Psicossociais conforme NR-1, utilizando o instrumento canônico COPSOQ II-BR.",
  keywords: [
    "NR-1",
    "COPSOQ II-BR",
    "FRPRT",
    "Riscos Psicossociais",
    "PGR",
    "SST",
    "LGPD",
  ],
  authors: [{ name: "NR-1 Copsoq Platform" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
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
        className={`${inter.variable} ${plexMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
