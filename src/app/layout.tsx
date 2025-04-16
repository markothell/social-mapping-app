// src/app/layout.tsx
import { WebSocketProvider } from '@/core/services/websocketService';
import { SyncInitializer } from '@/components/SyncInitializer';
import OfflineIndicator from '@/components/OfflineIndicator';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collaborative Activity App',
  description: 'Real-time collaborative activities for teams and classrooms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>
          {children}
          <SyncInitializer />
          <OfflineIndicator />
        </WebSocketProvider>
      </body>
    </html>
  );
}