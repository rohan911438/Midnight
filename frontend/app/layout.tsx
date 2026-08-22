import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Private Swap — Midnight',
  description: 'Front-running-resistant token swap on Midnight preview network',
  openGraph: {
    title: 'Private Swap — Midnight',
    description: 'Front-running-resistant token swap on Midnight preview network',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Private Swap — Midnight',
    description: 'Front-running-resistant token swap on Midnight preview network',
  },
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
            <div className="topbar-links">
              <a className="icon-link" href="https://github.com/rohan911438/Midnight" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <span className="network-pill">Midnight · preview</span>
            </div>
          </header>
          {children}
          <footer className="footer">
            <span>Private Swap — a Midnight preview-network demo. Nothing here is real value.</span>
            <div className="footer-links">
              <a href="https://github.com/rohan911438/Midnight" target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
              <a href="https://private-swap-backend.onrender.com/api/health" target="_blank" rel="noreferrer">
                Backend status ↗
              </a>
              <a href="https://explorer.preview.midnight.network" target="_blank" rel="noreferrer">
                Blockscout ↗
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
