import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "./auth-provider";
import { runtimeValue } from "./runtime-env";
import "./globals.css";
import ErrorReporterButton from "./error-reporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hub.niviontech.com.br"),
  title: "Hub Brasil | Fornecedores de rastreamento veicular",
  description: "Encontre fornecedores de rastreamento veicular, telemetria, conectividade, plataformas, instaladores e produtos validados em todo o Brasil.",
  keywords: ["Hub Brasil fornecedores de rastreamento", "fornecedores de rastreamento veicular", "telemetria veicular", "plataformas de rastreamento", "instaladores de rastreadores"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  verification: { google: "6cJIz4RORtGme7filMzTomcYg3rjd_a3d1hkhSO7ZtM" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Hub Brasil | Fornecedores de rastreamento veicular",
    description: "Fornecedores de rastreamento, telemetria, conectividade, plataformas e instaladores validados em todo o Brasil.",
    url: "/",
    siteName: "Hub Brasil",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "Hub Brasil — O marketplace do rastreamento veicular" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Hub Brasil | Fornecedores de rastreamento", description: "Encontre fornecedores de rastreamento veicular, telemetria e conectividade em todo o Brasil.", images: ["/og.png"] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hub Brasil",
  alternateName: "Hub Brasil fornecedores de rastreamento",
  url: "https://hub.niviontech.com.br/",
  description: "Plataforma para encontrar fornecedores de rastreamento veicular, telemetria, conectividade e instaladores no Brasil.",
  inLanguage: "pt-BR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <AuthProvider publishableKey={runtimeValue("CLERK_PUBLISHABLE_KEY")}>{children}</AuthProvider>
        <ErrorReporterButton />
      </body>
    </html>
  );
}
