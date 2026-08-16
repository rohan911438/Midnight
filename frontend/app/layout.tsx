import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Private Swap — Midnight',
  description: 'Front-running-resistant token swap on Midnight preview network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <span className="brand-mark" />
              Private Swap
            </div>
            <span className="network-pill">Midnight · preview</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
