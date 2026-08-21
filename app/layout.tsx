import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppModeProvider } from '@/contexts/AppModeContext';
import { GoogleCalendarProvider } from '@/contexts/GoogleCalendarContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Airbnb Operation - Gestão de Chácaras',
  description: 'Sistema completo de gestão de reservas para chácaras.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased text-slate-100 bg-[#0A0F2C]">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="orb w-[500px] h-[500px] bg-indigo-500 -top-20 -left-20" />
          <div className="orb w-[400px] h-[400px] bg-purple-500 top-1/2 -right-20" />
          <div className="orb w-[300px] h-[300px] bg-blue-500 -bottom-20 left-1/3" />
        </div>
        <AppModeProvider>
          <AuthProvider>
            <GoogleCalendarProvider>
              <div className="relative z-10">
                {children}
              </div>
            </GoogleCalendarProvider>
          </AuthProvider>
        </AppModeProvider>
      </body>
    </html>
  );
}
