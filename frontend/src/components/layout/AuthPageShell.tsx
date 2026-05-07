import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';

interface AuthPageShellProps {
  children: React.ReactNode;
}

export default function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <>
      <CssBaseline />
      {children}
    </>
  );
}
