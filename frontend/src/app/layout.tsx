/**
 * Root layout — wraps every page in the application.
 *
 * Loads two Google Fonts (Plus Jakarta Sans and Manrope) as CSS variables so
 * Tailwind utility classes (`font-manrope`, `font-plus-jakarta`) resolve at
 * runtime. Sets the default site-wide `<title>` and `<meta description>`.
 * All children are wrapped in `<AuthProvider>` (SessionProvider) so that any
 * page or component can call `useSession()` or `getServerSession()`.
 */
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ginhawa - Fast, Guided Online Consultations",
  description: "Telehealth platform for accessible healthcare in the Philippines.",
  icons: {
    icon: "/logo.svg",
  },
};

/** Root HTML shell. Applies font variables on `<html>` and renders children inside `<AuthProvider>`. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-manrope">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
