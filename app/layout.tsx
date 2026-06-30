import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parnassus Volunteer Portal",
  description:
    "Volunteer scheduling and hour tracking for Parnassus Preparatory Academy families.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
