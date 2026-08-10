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
import { Toaster } from 'sonner';
import Script from 'next/script';
import { AppProviderServer } from '@/providers/app-provider-server';

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
            'flex min-h-full bg-background font-sans antialiased',
            fontSans.variable,
          )}
        >
          <TRPCProvider>
            <AppProviderServer>
              <TooltipProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <UserProvider>
                    <div className='flex flex-1 justify-center'>
                      <div className='relative flex w-full flex-1 flex-col sm:max-w-lg'>
                        {children}
                        <MainNav />
                      </div>
                    </div>
                    <Toaster />
                  </UserProvider>
                </Suspense>
              </TooltipProvider>
            </AppProviderServer>
          </TRPCProvider>
          {/* Cloudflare Web Analytics (self-hosted replacement for Vercel
              Analytics + Speed Insights) — RUM pageviews + Core Web Vitals */}
          <Script
            defer
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "1439d25f74084cb7bd9186cdbc49318f"}'
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
