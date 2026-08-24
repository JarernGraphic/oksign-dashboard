import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'OKSIGN Dashboard — ระบบบริหารงานร้านป้าย',
  description: 'ระบบบริหารลูกค้า งานออกแบบ การผลิต การส่งมอบ และการชำระเงินสำหรับ OKSIGN',
  openGraph: {
    title: 'OKSIGN Dashboard',
    description: 'ระบบบริหารงานร้านป้าย ครบทุกขั้นตอน',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'OKSIGN Dashboard' }],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OKSIGN Dashboard',
    description: 'ระบบบริหารงานร้านป้าย ครบทุกขั้นตอน',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
