import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkBio | Your Premium Link-in-Bio",
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
