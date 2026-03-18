'use client';

import { Header } from '@/components/layout/header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRealtimeCourts, useRealtimeQueue, useRealtimeMatches, useRealtimeSettings } from '@/lib/hooks/use-realtime';
import { Toaster } from '@/components/ui/sonner';

export default function MainLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  useAuth();
  useRealtimeCourts();
  useRealtimeQueue();
  useRealtimeMatches();
  useRealtimeSettings();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      <Toaster />
    </div>
  );
}
