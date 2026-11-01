'use client';

import { useCallback, useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const APP_NAME = 'Eye Clinic EMR';

function deriveRouteTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';

  const [first, second, third] = segments;

  if (first === 'login') return 'Login';
  if (first === 'admin') return 'Admin Panel';
  if (first === 'profile') return 'Profile';
  if (first === 'letterhead') return 'Letterhead';

  if (first === 'patients') {
    if (!second) return 'All Patients';
    if (second === 'today') return "Today's Patients";
    if (second === 'new') return 'Register New Patient';
    if (third === 'edit') return 'Edit Patient';
    if (third === 'new-visit') return 'New Visit';
    return 'Patient Details';
  }

  if (first === 'prescriptions') {
    if (!second) return 'Prescriptions';
    if (second === 'new') return 'New Prescription';
    if (third === 'edit') return 'Edit Prescription';
    if (third === 'print') return 'Print Prescription';
    return 'Prescription Details';
  }

  if (first === 'certificates') {
    if (!second) return 'Certificates';
    return 'Certificate';
  }

  return APP_NAME;
}

export default function RouteTitleSync() {
  const pathname = usePathname();

  const applyTitle = useCallback(() => {
    const pageTitle = deriveRouteTitle(pathname || '/');
    document.title = `${pageTitle} | ${APP_NAME}`;
  }, [pathname]);

  // Apply before paint when possible to reduce the default-title flash.
  useLayoutEffect(() => {
    applyTitle();
  }, [applyTitle]);

  useEffect(() => {
    applyTitle();

    const onFocus = () => applyTitle();
    const onPageShow = () => applyTitle();
    const onVisibilityChange = () => {
      if (!document.hidden) applyTitle();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [applyTitle]);

  return null;
}
