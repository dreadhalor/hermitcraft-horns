import { ClipBuilderProvider } from '@/providers/clip-builder-provider';
import React from 'react';
import { AudioProvider } from '@repo/audio-editor';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClipBuilderProvider>
      <AudioProvider>{children}</AudioProvider>
    </ClipBuilderProvider>
  );
};

export default Layout;
