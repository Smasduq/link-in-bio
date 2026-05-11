import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "../styles/globals.css";
import "../styles/animations.css";
import SessionProvider from "@/components/SessionProvider";

const syne = Syne({ 
  subsets: ["latin"],
  variable: "--font-display",
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "LinkBio | Your links. Your brand. One page.",
  description: "Create a beautiful, premium link-in-bio page in seconds.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://linkbio.com",
    siteName: "LinkBio",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
