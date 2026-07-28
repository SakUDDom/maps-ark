import type { Metadata } from "next";
import "./globals.css"; // 🚀 នេះហើយខ្សែភ្លើងដែលតភ្ជាប់ពណ៌!

export const metadata: Metadata = {
  title: "Maps Ark Modern",
  description: "ប្រព័ន្ធគ្រប់គ្រង Maps Ark ជំនាន់ថ្មី",
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