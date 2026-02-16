'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminHome = pathname === '/admin';

  return (
    // Break out of parent's max-width constraint for admin pages
    // Uses fixed positioning to take full viewport width
    <div className="fixed inset-0 z-10 overflow-x-hidden overflow-y-auto bg-background">
      {/* Admin navigation header */}
      {!isAdminHome && (
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin')}
              className="mr-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </div>
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
