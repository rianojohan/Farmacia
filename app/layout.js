import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Solo la Salud · Sistema de gestión",
  description: "Prototipo de sistema de gestión para droguería Solo la Salud",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
