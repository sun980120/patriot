import type { Metadata } from 'next';
import './globals.css';
import { CLUB_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${CLUB_NAME} 스마트 회비 관리 웹 애플리케이션`,
  description: `${CLUB_NAME} 동호회 회비, 세입, 지출, 회원 승인 관리를 위한 웹 애플리케이션`,
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans text-slate-800">{children}</body>
    </html>
  );
}
