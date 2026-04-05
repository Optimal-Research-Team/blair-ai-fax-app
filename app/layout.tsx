import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { JotaiProvider } from "@/components/providers/JotaiProvider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blair MRI - AI Referral Management",
  description: "Intelligent fax indexing and referral management for healthcare",
  icons: {
    icon: "/logo-white-bg.svg",
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
        className={`${interSans.variable} ${robotoMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <JotaiProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="bottom-right" closeButton />
            </ThemeProvider>
          </JotaiProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
