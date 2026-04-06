import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '医考题库助手',
  description: '执业医师考试题库助手 - 做题、模拟考试、错题本',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}