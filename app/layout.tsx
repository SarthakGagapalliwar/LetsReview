import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/them-provider";
import { QueryProvider } from "@/components/provider/qurey-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next"

/**
 * Root Layout - Design System
 *
 * Typography:
 * - Thin sans-serif typography (Inter)
 * - Clean, neutral, reusable design
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LetsReview",
  description: "Instant AI feedback on your GitHub PRs to merge faster.",
  icons: {
    icon: "/logoipsum.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-mono antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute={"class"}
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Analytics />
            <Toaster richColors closeButton position="bottom-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
