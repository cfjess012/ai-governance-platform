import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Governance Platform',
  description: 'AI Use Case Intake and Risk Assessment Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="glass sticky top-0 z-50 border-b">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-[#00539B] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                AI Governance Use Case Process
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/inventory"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#00539B] hover:bg-blue-50 rounded-lg transition-colors"
              >
                Inventory
              </Link>
              <Link
                href="/intake"
                className="ml-2 px-4 py-2 text-sm font-medium text-white bg-[#00539B] hover:bg-[#003d73] rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                New Intake
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1 bg-grid">{children}</main>
      </body>
    </html>
  );
}
