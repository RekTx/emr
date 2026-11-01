'use client';

import { use, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Prescription, RefractionRow } from '@/lib/types';

export default function PrintPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const branch = user?.branch || 'branch-1';
  const headerSrc = branch === 'branch-2' ? '/header-branch-2.png' : '/header-branch-1.png';
  const footerSrc = branch === 'branch-2' ? '/footer-branch-2.png' : '/footer-branch-1.jpg';
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getPrescription, getPatient } = useData();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const hasAutoPrintedRef = useRef(false);
  const source = searchParams.get('from') || 'view';

  useEffect(() => {
    let active = true;

    async function loadPrescription() {
      let prescription = await getPrescription(id);

      // Backfill regNo for legacy records that may not have it on the prescription doc.
      if (prescription && !prescription.regNo && prescription.patientId) {
        const patient = await getPatient(prescription.patientId);
        if (patient?.regNo) {
          prescription = { ...prescription, regNo: patient.regNo };
        }
      }

      if (!active) return;
      setRx(prescription);
      setLoading(false);
    }

    loadPrescription();

    return () => {
      active = false;
    };
  }, [id, getPatient, getPrescription]);

  useEffect(() => {
    if (loading || !rx || hasAutoPrintedRef.current) return;
    hasAutoPrintedRef.current = true;
    
    const returnHref = source === 'list'
      ? '/prescriptions'
      : source === 'edit'
        ? `/prescriptions/${id}/edit`
        : `/prescriptions/${id}`;

    const handleAfterPrint = () => {
      router.push(returnHref);
    };
    
    window.addEventListener('afterprint', handleAfterPrint);
    
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 120);
    
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [loading, rx, source, id, router]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!rx) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="text-center py-20">Prescription Not Found</div>
      </ProtectedRoute>
    );
  }

  const checkedHistory = rx.history?.filter((h) => h.pcheck) || [];
  const checkedExamination = rx.examination?.filter((e) => e.pcheck) || [];
  const checkedInvestigation = rx.investigation?.filter((i) => i.pcheck) || [];
  const checkedDiagnosis = rx.diagnosis?.filter((d) => d.pcheck) || [];
  const checkedSurgical = rx.surgical?.filter((s) => s.pcheck) || [];
  const printableRegNo = String(rx.regNo || 'N/A').replace(/^REG-/i, '');
  const { review, instructions } = splitReviewInstructions(rx.reviewInstructions);
  const returnHref = source === 'list'
    ? '/prescriptions'
    : source === 'edit'
      ? `/prescriptions/${id}/edit`
      : `/prescriptions/${id}`;

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="bg-white min-h-screen print:min-h-0 print:h-auto" style={{ fontSize: '10px' }}>
        <div className="no-print pt-4 pb-3 px-4 flex justify-end">
          <button
            onClick={() => router.push(returnHref)}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
        <div className="max-w-[210mm] mx-auto bg-white print:!max-w-[190mm] print:!w-[190mm] print:!mx-auto">
          <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%-95mm)] print:border-l-2 print:border-black print:z-30" />
          <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%+95mm)] print:border-l-2 print:border-black print:z-30" />
          <table className="w-full">
            <thead className="table-header-group">
              <tr>
                <td>
                  <div className="w-full h-[248px] print:block hidden"></div>
                  <div className="w-full mb-4 print:mb-0 print:fixed print:top-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
                    <Image src={headerSrc} alt="Clinic Header" width={794} height={200} className="w-full h-auto border border-black" priority />
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-8 align-top">

          {/* Patient Info */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-1 mb-4 text-[10px]">
            <div><span className="font-semibold">Name:</span> <span className="font-bold">{rx.patientName}</span></div>
            <div><span className="font-semibold">Reg No:</span> {printableRegNo}</div>
            <div><span className="font-semibold">Age/Gender:</span> {rx.age}/{rx.sex}</div>
            <div><span className="font-semibold">Date:</span> {rx.visitDate}</div>
            <div><span className="font-semibold">S/D/W of:</span> {rx.soDoWo || 'N/A'}</div>
            <div className="col-span-2"><span className="font-semibold">Address:</span> {rx.address || 'N/A'}</div>
            <div><span className="font-semibold">City:</span> {rx.city || 'N/A'}</div>
            <div><span className="font-semibold">Mobile:</span> {rx.mobile || 'N/A'}</div>
            <div><span className="font-semibold">Misc:</span> {rx.healthCard || 'N/A'}</div>
          </div>

          {/* IOP & Clinical Info */}
          {(rx.showIOP !== false || rx.showClinical) && (
            <div className="mb-3 text-[10px] flex flex-wrap gap-x-4">
              {rx.showIOP !== false && (
                <span><span className="font-semibold">IOP:</span> RE {rx.iopRight} | LE {rx.iopLeft}</span>
              )}
              {rx.showClinical && (
                <div className="flex flex-wrap gap-x-4">
                  {rx.eoms !== 'WNL' && <span><span className="font-semibold">EOMs:</span> {rx.eoms}</span>}
                  {rx.tropia !== 'N/A' && <span><span className="font-semibold">Tropia:</span> {rx.tropia}</span>}
                  {rx.phoria !== 'N/A' && <span><span className="font-semibold">Phoria:</span> {rx.phoria}</span>}
                </div>
              )}
            </div>
          )}

          {/* Refraction Tables */}
          <div className={`grid ${rx.showPrevRefraction !== false && rx.showTodayRefraction !== false ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
            {rx.showPrevRefraction && (
              <div>
                <p className="font-semibold mb-1 text-center">Previous Refraction Card</p>
                <PrintRefTable re={rx.prevRefractionRE} le={rx.prevRefractionLE} ipd={rx.prevIPD} />
              </div>
            )}
            {rx.showTodayRefraction !== false && (
              <div>
                <p className="font-semibold mb-1 text-center">Today&apos;s Refraction Card</p>
                <PrintRefTable re={rx.todayRefractionRE} le={rx.todayRefractionLE} ipd={rx.todayIPD} />
              </div>
            )}
          </div>

          {/* History */}
          {checkedHistory.length > 0 && (
            <PrintSection title="History">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {checkedHistory.map((h, i) => (
                    <tr key={i} className="break-inside-avoid">
                      { (h.personalComplaints || h.personalComplaintsDetail) && (
                        <td className="border border-gray-300 px-2 py-1.5 align-top">
                          {h.personalComplaints && (
                            <div><span className="font-bold">P/C:</span> {formatIndexedList(h.personalComplaints)}</div>
                          )}
                          {h.personalComplaintsDetail && (
                            <div><span className="font-bold">Details:</span> {h.personalComplaintsDetail}</div>
                          )}
                        </td>
                      )}

                      { h.detail && (
                        <td className="border border-gray-300 px-2 py-1.5 align-top">
                          <span className="font-bold">History:</span> {formatIndexedList(h.detail)}
                        </td>
                      )}

                      <td className="border border-gray-300 px-2 py-1.5 align-top">{h.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Examination */}
          {checkedExamination.length > 0 && (
            <PrintSection title="Examination">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {checkedExamination.map((e, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Right Eye:</span> {e.rightEye}</td>
                      <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Left Eye:</span> {e.leftEye}</td>
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{e.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Investigation */}
          {checkedInvestigation.length > 0 && (
            <PrintSection title="Investigation">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {checkedInvestigation.map((inv, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{inv.eyeSide}</td>
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{formatInvestigationTypes(inv)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{inv.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Diagnosis */}
          {checkedDiagnosis.length > 0 && (
            <PrintSection title="Diagnosis">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {checkedDiagnosis.map((d, i) => (
                    <tr key={i} className="break-inside-avoid">
                      {d.eyeSide === 'N/A' ? (
                        <>
                          <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Right Eye:</span> {formatEyeDiagnosis(d.rightDisease, d.rightDetails)}</td>
                          <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Left Eye:</span> {formatEyeDiagnosis(d.leftDisease, d.leftDetails)}</td>
                        </>
                      ) : (
                        <>
                          <td className="border border-gray-300 px-2 py-1.5 align-top">{d.eyeSide}</td>
                          <td className="border border-gray-300 px-2 py-1.5 align-top">{formatIndexedList(d.details)}</td>
                        </>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{d.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Surgical */}
          {checkedSurgical.length > 0 && (
            <PrintSection title="Surgical Management">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {checkedSurgical.map((s, i) => (
                    <tr key={i} className="break-inside-avoid">
                      {s.eyeSide === 'N/A' ? (
                        <>
                          <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Right Eye:</span> {formatIndexedList(s.rightDetails)}</td>
                          <td className="border border-gray-300 px-2 py-1.5 align-top"><span className="font-bold">Left Eye:</span> {formatIndexedList(s.leftDetails)}</td>
                        </>
                      ) : (
                        <>
                          <td className="border border-gray-300 px-2 py-1.5 align-top">{s.eyeSide}</td>
                          <td className="border border-gray-300 px-2 py-1.5 align-top">{formatIndexedList(s.details)}</td>
                        </>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5 align-top">{s.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Medication */}
          {(rx.medication?.length || 0) > 0 && (
            <PrintSection title="Medication">
              <table className="w-full border-collapse break-inside-avoid shadow-none">
                <tbody>
                  {rx.medication.map((m, i) => (
                    <tr key={i} className="break-inside-avoid text-[10px] font-normal text-black font-urdu">
                      <td className="border border-gray-300 px-2 py-2 align-top text-[10px] font-bold">{i + 1}. {m.medicine}</td>
                      <td className="border border-gray-300 px-2 py-2 align-top text-text">{m.frequency}</td>
                      <td className="border border-gray-300 px-2 py-2 align-top text-text">{m.eyeSide}</td>
                      <td className="border border-gray-300 px-2 py-2 align-top text-text">{m.usage}</td>
                      <td className="border border-gray-300 px-2 py-2 align-top text-text">{m.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PrintSection>
          )}

          {/* Review + Instructions (single row, no headings) */}
          {(review.length > 0 || instructions.length > 0) && (
            <div className="mb-3 border border-black">
              <div className="grid grid-cols-2 text-[10px]">
                <div className="min-h-[1.4em] px-2 py-1 text-right font-urdu" dir="rtl">
                  {review.map((item, idx) => (
                    <p key={`review-${idx}`} className="whitespace-pre-wrap">• {item}</p>
                  ))}
                </div>
                <div className="min-h-[1.4em] px-2 py-1 text-right border-l border-black font-urdu" dir="rtl">
                  {instructions.map((item, idx) => (
                    <p key={`instruction-${idx}`} className="whitespace-pre-wrap">• {item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}


                </td>
              </tr>
            </tbody>
            <tfoot className="table-footer-group">
              <tr>
                <td>
                  <div className="w-full h-[208px] print:block hidden"></div>
                  <div className="w-full mt-4 print:mt-0 print:fixed print:bottom-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
                    <Image src={footerSrc} alt="Clinic Footer" width={794} height={150} className="w-full h-auto" />
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          <div
            className="hidden print:grid fixed left-1/2 -translate-x-1/2 w-[190mm] z-40 grid-cols-3 gap-2 text-[9px] leading-tight text-text-secondary items-center px-2 border-t border-gray-400 pt-1"
            style={{ bottom: 'calc(0.5in + 60px)' }}
          >
            <span className="text-left">Verbal consent has been taken for examination.</span>
            <span className="text-center">This is electronically generated, no need for signature.</span>
            <span className="text-right">Not Valid for Court of Law.</span>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="font-bold text-[11px] text-black mb-1 border-b border-gray-200 pb-0.5 text-center">{title}</h3>
      {children}
    </div>
  );
}

function PrintRefTable({ re, le, ipd }: { re: RefractionRow; le: RefractionRow; ipd: string }) {
  const cols: { key: keyof RefractionRow; label: string }[] = [
    { key: 'sph', label: 'SPH' },
    { key: 'cyl', label: 'CYL' },
    { key: 'axis', label: 'Axis' },
    { key: 'va', label: 'BCVA' },
    { key: 'add', label: 'Addition for Near' },
  ];
  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 px-1 py-0.5 font-semibold text-left">Eye</th>
            {cols.map((c) => (
              <th key={c.key} className="border border-gray-300 px-1 py-0.5 font-semibold text-left">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-1 py-0.5 font-medium">RE</td>
            {cols.map((c) => <td key={c.key} className="border border-gray-300 px-1 py-0.5">{re?.[c.key]}</td>)}
          </tr>
          <tr>
            <td className="border border-gray-300 px-1 py-0.5 font-medium">LE</td>
            {cols.map((c) => <td key={c.key} className="border border-gray-300 px-1 py-0.5">{le?.[c.key]}</td>)}
          </tr>
        </tbody>
      </table>
      <p className="mt-0.5"><span className="font-semibold">IPD:</span> {ipd}</p>
    </>
  );
}

function formatInvestigationTypes(inv: { type?: string; type2?: string }) {
  const parts = [inv.type, inv.type2]
    .filter(Boolean)
    .join(', ')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  return parts.map((part, idx) => (
    <span key={`${part}-${idx}`}>
      <span className="font-bold">{idx + 1}.</span> {part}{idx < parts.length - 1 ? ' ' : ''}
    </span>
  ));
}

function formatEyeDiagnosis(name?: string, details?: string) {
  const cleanName = name?.trim() || '';
  const cleanDetails = details?.trim() || '';
  if (cleanName && cleanDetails) {
    return (
      <>
        {cleanName} - {formatIndexedList(cleanDetails)}
      </>
    );
  }
  if (cleanName) return cleanName;
  return formatIndexedList(cleanDetails);
}

function formatIndexedList(value?: string) {
  const parts = (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  return parts.map((part, idx) => (
    <span key={`${part}-${idx}`}>
      <span className="font-bold">{idx + 1}.</span> {part}{idx < parts.length - 1 ? ' ' : ''}
    </span>
  ));
}


function splitListValue(text?: string): string[] {
  if (!text?.trim()) return [];
  return text.split(/\n|;/).map((part) => part.trim()).filter(Boolean);
}

function splitReviewInstructions(text?: string): { review: string[]; instructions: string[] } {
  if (!text?.trim()) return { review: [], instructions: [] };

  const parts = text.split(' | ').map((part) => part.trim()).filter(Boolean);
  const reviewPart = parts.find((part) => part.startsWith('Review:'));
  const instructionPart = parts.find((part) => part.startsWith('Instructions:'));

  const review = splitListValue(reviewPart ? reviewPart.replace('Review:', '').trim() : (instructionPart ? '' : text.trim()));
  const instructions = splitListValue(instructionPart ? instructionPart.replace('Instructions:', '').trim() : '');

  return { review, instructions };
}
