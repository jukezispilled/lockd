// app/layout.jsx
import { Inter, JetBrains_Mono } from "next/font/google";
import WalletProviders from "@/components/Provider";
import Banner from "@/components/Banner"; // Import the new Banner component
import "./globals.css";

const roundedSans = Inter({
  variable: "--font-rounded-sans",
  subsets: ["latin"],
  weight: ["700"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "lockd",
  description: "are you lockd in?",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${roundedSans.variable} ${monoFont.variable} antialiased`}
      >
        <WalletProviders>
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}