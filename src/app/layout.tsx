import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Move | Treinos, evolução e acompanhamento em um só lugar.",
    template: "%s | Move",
  },
  description:
    "Aluno treina com clareza, personal acompanha de perto e a IA ajuda a entender treinos, resultados e próximos passos. Treinos guiados, MoveScan, chat e notificações.",
  appleWebApp: {
    capable: true,
    title: "Move",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

/**
 * Inline script that runs before first paint to set `data-theme` on <html>,
 * preventing a flash of the wrong theme (FOUC). Reads from localStorage.
 * If nothing is stored, defaults to "dark".
 */
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem("move-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch(e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
