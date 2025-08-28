'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from '@/components/navigation';
import { GuidedTour } from '@/components/guidedTour';
import { useAppStore } from '@/lib/store/appStore';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: metadata export needs to be moved to a separate metadata file for client components
// For now, we'll handle this in the head

function RootLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isGuidedTourOpen } = useAppStore();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-1">
        {children}
      </div>
      {isGuidedTourOpen && <GuidedTour />}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Dusty Apple - Your Feedback Hub</title>
        <meta name="description" content="Turn product feedback into customer engagement with Dusty Apple" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  );
}
