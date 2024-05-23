import React from 'react';
import { AudioProvider } from './audio-provider';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <AudioProvider>{children}</AudioProvider>;
};

export default Layout;
