import { ClipBuilderProvider } from '@/providers/clip-builder-provider';
import React from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <ClipBuilderProvider>{children}</ClipBuilderProvider>;
};

export default Layout;
