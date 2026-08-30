import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "ZonaHardware",
  description:
    "Catálogo, depósitos y ventas de ZonaHardware en un solo sistema, con precios diferenciados para clientes y revendedores.",
};

const fontSans = Inter({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const fontDisplay = Rajdhani({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
