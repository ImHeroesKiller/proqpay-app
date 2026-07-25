import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

// Keep authenticated server rendering close to Indonesian users and the
// Asia-Pacific database region instead of the previous US-East default.
export const preferredRegion = "sin1";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ProQPay — Enterprise Payroll OS",
    template: "%s | ProQPay",
  },
  description:
    "ProQPay Enterprise Payroll Operating System by PT Mandiri Semesta Gemilang (MSG).",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${manrope.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
