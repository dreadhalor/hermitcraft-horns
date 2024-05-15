import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { TRPCProvider } from '@/trpc/trpc-provider';
import { TooltipProvider } from '@ui/tooltip';
import { Suspense } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { MainNav } from '@/components/main-nav';
import { UserProvider } from '@/providers/user-provider';
import { AppProvider } from '@/providers/app-provider';
import { ClipProvider } from '@/providers/clip-provider';
import { Toaster } from 'sonner';

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
    <ClerkProvider>
      <html lang='en' suppressHydrationWarning className='h-full'>
        <body
          className={cn(
            'h-full bg-background font-sans antialiased',
            fontSans.variable,
          )}
        >
          <TRPCProvider>
            <AppProvider>
              <ClipProvider>
                <TooltipProvider>
                  <Suspense fallback={<div>Loading...</div>}>
                    <UserProvider>
                      <div className='flex h-full flex-col'>
                        {children}
                        <MainNav />
                      </div>
                      <Toaster />
                    </UserProvider>
                  </Suspense>
                </TooltipProvider>
              </ClipProvider>
            </AppProvider>
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
