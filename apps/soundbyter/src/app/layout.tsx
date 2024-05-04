import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClipBuilderProvider } from '../providers/clip-builder-provider';
import { TRPCProvider } from '@/trpc/trpc-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Suspense } from 'react';
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import { ProfileButton } from '@/components/main-nav/buttons/profile-button';
import { EditorButton } from '@/components/main-nav/buttons/editor-button';
import { HomeButton } from '@/components/main-nav/buttons/home-button';
import { MainNav } from '@/components/main-nav/main-nav';

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
            <TooltipProvider>
              <Suspense fallback={<div>Loading...</div>}>
                <ClipBuilderProvider>
                  <div className='flex h-full flex-col'>
                    {children}
                    <MainNav />
                  </div>
                </ClipBuilderProvider>
              </Suspense>
            </TooltipProvider>
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
