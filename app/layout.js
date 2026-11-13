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
    <html lang="es" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable} font-sans`}>
        {/* Aplica el modo oscuro guardado antes del primer render para
            evitar un destello de tema claro en cada página. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("tema")==="oscuro"){document.documentElement.classList.add("dark")}}catch(e){}',
          }}
        />
        {children}
      </body>
    </html>
  );
}
