'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const isActive = (path: string) => {
    if (path === '/patients' && pathname === '/patients') return true;
    if (path !== '/patients' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleSwitchBranch = async (targetBranch: 'branch-1' | 'branch-2') => {
    if (user?.branch === targetBranch) return;
    try {
      const res = await fetch('/api/auth/switch-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: targetBranch }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to switch database branch');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to branch database server');
    }
  };

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm print:hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/patients"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-dark to-primary bg-clip-text text-transparent tracking-tight">
              Eye Clinic EMR
            </span>
          </Link>
 
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/patients" active={isActive('/patients') && !isActive('/patients/today')}>
              All Patients
            </NavLink>
            <NavLink href="/patients/today" active={isActive('/patients/today')}>
              Today&apos;s Patients
            </NavLink>
 
            {user.role === 1 && (
              <>
                <NavLink href="/prescriptions" active={isActive('/prescriptions')}>
                  Prescriptions
                </NavLink>
                <NavLink href="/letterhead" active={isActive('/letterhead')}>
                  Letter Head
                </NavLink>
                <NavLink href="/certificates" active={isActive('/certificates')}>
                  Certificates
                </NavLink>
                <NavLink href="/admin" active={isActive('/admin')}>
                  ⚙️ Admin
                </NavLink>
              </>
            )}
          </div>
 
          {/* Right Header Side: Branch Switcher & User Menu */}
          <div className="flex items-center gap-3">
            {/* Branch Switcher (Only for Doctor/Admin) */}
            {user.role === 1 && (
              <div className="hidden sm:flex items-center gap-1 bg-surface-alt border border-border rounded-full p-0.5">
                <button
                  onClick={() => handleSwitchBranch('branch-1')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    user.branch !== 'branch-2'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-primary hover:bg-white/50'
                  }`}
                >
                  🏥 Branch 1
                </button>
                <button
                  onClick={() => handleSwitchBranch('branch-2')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    user.branch === 'branch-2'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-primary hover:bg-white/50'
                  }`}
                >
                  🏥 Branch 2
                </button>
              </div>
            )}

            {user.role === 2 && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-alt border border-border rounded-full text-xs font-semibold text-text-secondary capitalize">
                📍 {user.branch === 'branch-2' ? 'Branch 2' : 'Branch 1'}
              </div>
            )}

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-sm hover:bg-primary-100 transition-colors cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
                <span className="text-text-secondary font-medium capitalize">
                  {user.username}
                </span>
                <span className="text-xs text-text-muted hidden sm:inline">
                  ({user.role === 1 ? 'Doctor' : 'Reception'})
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-white shadow-lg p-1.5 z-50 space-y-1">
                  {user.role === 1 && (
                    <div className="sm:hidden border-b border-border pb-1.5 mb-1.5 px-2">
                      <p className="text-[10px] text-text-muted font-semibold uppercase mb-1">Branch</p>
                      <select
                        value={user.branch || 'branch-1'}
                        onChange={(e) => handleSwitchBranch(e.target.value as any)}
                        className="w-full text-xs h-8 px-2 border border-border rounded bg-white font-medium"
                      >
                        <option value="branch-1">🏥 Branch 1</option>
                        <option value="branch-2">🏥 Branch 2</option>
                      </select>
                    </div>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-surface-alt hover:text-primary transition-colors"
                  >
                    Profile
                  </Link>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                  }}
                  id="logout-button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-danger hover:bg-danger-light transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-border">
        <div className="flex overflow-x-auto gap-1 px-4 py-2">
          <NavLink href="/patients" active={isActive('/patients') && !isActive('/patients/today')} mobile>
            All Patients
          </NavLink>
          <NavLink href="/patients/today" active={isActive('/patients/today')} mobile>
            Today
          </NavLink>
          {user.role === 1 && (
            <>
              <NavLink href="/prescriptions" active={isActive('/prescriptions')} mobile>
                Prescriptions
              </NavLink>
              <NavLink href="/letterhead" active={isActive('/letterhead')} mobile>
                Letterhead
              </NavLink>
              <NavLink href="/certificates" active={isActive('/certificates')} mobile>
                Certificates
              </NavLink>
              <NavLink href="/admin" active={isActive('/admin')} mobile>
                Admin
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
  mobile,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
        ${
          active
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-text-secondary hover:text-primary hover:bg-primary-50'
        }
        ${mobile ? 'text-xs px-3 py-1.5' : ''}
      `}
    >
      {children}
    </Link>
  );
}
