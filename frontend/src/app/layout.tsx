import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth";
import { GameModeProvider } from "@/lib/game-mode";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "CertMasterAI — Microsoft Certification Practice",
  description: "AI-powered Microsoft certification exam practice platform with RAG-grounded questions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange themes={["light", "dark", "system"]}>
          <AuthProvider>
            <QueryProvider>
              <GameModeProvider>
                <AppShell>
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </AppShell>
              </GameModeProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
