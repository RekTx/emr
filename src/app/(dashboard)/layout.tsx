'use client';

import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="pt-16 md:pt-16 min-h-screen print:!pt-0 print:!min-h-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:!px-0 print:!py-0 print:!max-w-none print:!w-full print:!m-0">
          {children}
        </div>
      </main>
    </ProtectedRoute>
  );
}
