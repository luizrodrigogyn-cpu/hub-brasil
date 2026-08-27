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
  title: "Hub Brasil — Tecnologia para rastreamento veicular",
  description: "Encontre fornecedores validados, produtos especializados e conexões comerciais para o mercado de rastreamento veicular.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Hub Brasil — O marketplace do rastreamento veicular",
    description: "Fornecedores validados, produtos especializados e eventos do setor em todo o Brasil.",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "Hub Brasil — O marketplace do rastreamento veicular" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Hub Brasil", description: "O marketplace do rastreamento veicular", images: ["/og.png"] },
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
        <AuthProvider publishableKey={runtimeValue("CLERK_PUBLISHABLE_KEY")}>{children}</AuthProvider>
        <ErrorReporterButton />
      </body>
    </html>
  );
}
