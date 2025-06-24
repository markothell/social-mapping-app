// src/app/layout.tsx
import { WebSocketProvider } from '@/core/services/websocketService';
import { SyncInitializer } from '@/components/SyncInitializer';
import OfflineIndicator from '@/components/OfflineIndicator';
import CapacityAlert from '@/components/CapacityAlert';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Metadata } from 'next';
import './globals.css';

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
        <NotificationProvider>
          <WebSocketProvider>
            {children}
            <SyncInitializer />
            <OfflineIndicator />
            <CapacityAlert />
          </WebSocketProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}