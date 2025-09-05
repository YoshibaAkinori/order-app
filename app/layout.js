import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigurationProvider } from "./contexts/ConfigurationContext";
import { OrderDataProvider } from "./contexts/OrderDataContext";
import MainLayout from "../components/MainLayout";
import { InboxProvider } from './contexts/InboxContext';
import "./print.css";

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
      <body>
        <ConfigurationProvider>
          <OrderDataProvider>
            <InboxProvider> 
              <MainLayout>
                {children}
              </MainLayout>
            </InboxProvider>
          </OrderDataProvider>
        </ConfigurationProvider>
      </body>
    </html>
  );
}