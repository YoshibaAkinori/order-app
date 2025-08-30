import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigurationProvider } from "./contexts/ConfigurationContext";
import MainLayout from "../components/MainLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "松栄寿司注文管理システム",
  description: "松栄寿司の年末年始注文管理を行うためのアプリケーションです。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConfigurationProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ConfigurationProvider>
      </body>
    </html>
  );
}