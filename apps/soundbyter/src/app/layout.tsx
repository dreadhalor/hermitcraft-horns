import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClipBuilderProvider } from '../providers/clip-builder-provider';
import { TRPCProvider } from '@/trpc/trpc-provider';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Hermitcraft Horns',
  description: 'Create your own Hermitcraft Horns!',
  icons: '/favicon.svg',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning className='h-full'>
      <body
        className={cn(
          'h-full bg-background font-sans antialiased',
          fontSans.variable,
        )}
      >
        <TRPCProvider>
          <ClipBuilderProvider>{children}</ClipBuilderProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
