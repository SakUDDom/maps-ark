import type { Metadata } from "next";
import "./globals.css"; // 🚀 នេះហើយខ្សែភ្លើងដែលតភ្ជាប់ពណ៌!

export const metadata: Metadata = {
  title: 'Maps Ark',
  description: 'GIS Field Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Maps Ark',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body>{children}</body>
    </html>
  );
}
