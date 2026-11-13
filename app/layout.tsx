import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drawing Chat · 클래식 메신저',
  description: '사람과 연결되고, 관심사로 모이다. Drawing Chat UI 데모.',
  applicationName: 'Drawing Chat',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
