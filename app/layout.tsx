import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = { title: "Nexo Tour | Gestión turística", description: "ERP de reservas, operaciones y distribución para empresas de turismo." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es" suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider></body></html>; }
