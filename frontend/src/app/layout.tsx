import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyncBoard',
  description: 'Real-time collaborative Kanban board',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #e8e7ed',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#1a1a2e',
            },
          }}
        />
      </body>
    </html>
  );
}
