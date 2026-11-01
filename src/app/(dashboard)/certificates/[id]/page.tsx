'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { deleteCertificate, getCertificate } from '@/lib/firestore';
import { Certificate, LetterStyle } from '@/lib/types';

const DEFAULT_STYLE: LetterStyle = {
  fontFamily: 'Times New Roman, serif',
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'left',
  fontWeight: 400,
  italic: false,
};

function formatDate(value: unknown): string {
  if (!value) return '-';
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate: () => Date };
    return maybeTimestamp.toDate().toLocaleString();
  }
  return '-';
}

export default function ViewCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const branch = user?.branch || 'branch-1';
  const headerSrc = branch === 'branch-2' ? '/header-branch-2.png' : '/header-branch-1.png';
  const footerSrc = branch === 'branch-2' ? '/footer-branch-2.png' : '/footer-branch-1.jpg';
  const { id } = use(params);
  const router = useRouter();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const contentStyle = {
    ...DEFAULT_STYLE,
    ...(certificate?.style || {}),
  } satisfies LetterStyle;

  useEffect(() => {
    getCertificate(id)
      .then((data) => setCertificate(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!certificate) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-text">Certificate Not Found</h2>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 rounded bg-primary text-white text-sm font-medium cursor-pointer"
          >
            Back
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  const handleDelete = async () => {
    const shouldDelete = window.confirm(`Delete certificate "${certificate.title}"?`);
    if (!shouldDelete) return;

    setDeleting(true);
    try {
      await deleteCertificate(certificate.id);
      router.push('/certificates');
    } catch (err) {
      console.error('Failed to delete certificate', err);
      alert('Failed to delete certificate. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-4 animate-fade-in">
        <div className="no-print bg-white rounded-xl border border-border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text">{certificate.title}</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Created by {certificate.createdByName}
              {certificate.createdAt ? ` on ${formatDate(certificate.createdAt)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
            >
              Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="max-w-[210mm] mx-auto print:!max-w-[190mm] print:!w-[190mm] print:!mx-auto" style={{ minHeight: '297mm' }}>
            <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%-95mm)] print:border-l-2 print:border-black print:z-30" />
            <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%+95mm)] print:border-l-2 print:border-black print:z-30" />
            <div className="w-full print:fixed print:top-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
              <Image
                src={headerSrc}
                alt="Clinic Header"
                width={794}
                height={200}
                className="w-full h-auto border border-black"
                priority
              />
            </div>

            <div className="flex-1 flex flex-col p-8 min-h-[500px] print:p-0 print:pt-[268px] print:pb-[218px]">
              <div className="w-full max-w-[170mm] mx-auto flex-1">
                <div
                  className="letter-rich-content w-full flex-1 bg-transparent text-text border-none px-6 py-8 min-h-[400px] print:p-0 print:m-0 print:min-h-0"
                  style={{
                    fontFamily: contentStyle.fontFamily,
                    fontSize: `${contentStyle.fontSize}px`,
                    lineHeight: String(contentStyle.lineHeight),
                    letterSpacing: `${contentStyle.letterSpacing}px`,
                    textAlign: contentStyle.textAlign,
                    fontWeight: contentStyle.fontWeight,
                    fontStyle: contentStyle.italic ? 'italic' : 'normal',
                  }}
                >
                  {certificate.contentHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: certificate.contentHtml }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{certificate.content}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full mt-auto print:fixed print:bottom-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
              <Image
                src={footerSrc}
                alt="Clinic Footer"
                width={794}
                height={150}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          .letter-rich-content h1,
          .letter-rich-content h2,
          .letter-rich-content h3 {
            margin: 0 0 0.6em;
            line-height: 1.25;
          }

          .letter-rich-content p {
            margin: 0 0 0.75em;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
