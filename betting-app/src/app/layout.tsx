import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'CD Picks — Churchill Downs Betting System',
  description: 'Disciplined horse racing analysis and bankroll tracker for Churchill Downs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 text-white flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-20 sm:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
