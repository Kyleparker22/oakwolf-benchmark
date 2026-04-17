import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oakwolf Epic Security Benchmark",
  description: "Benchmark your Epic Security and IAM maturity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
