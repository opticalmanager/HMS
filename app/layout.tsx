import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex HMS & Clinical EMR",
  description: "Enterprise Monolithic Hospital Management System with 12 Core Clinical Modules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F6F7F9] text-slate-900">
        {children}
      </body>
    </html>
  );
}
