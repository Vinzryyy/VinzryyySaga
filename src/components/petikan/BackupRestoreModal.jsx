/**
 * BackupRestoreModal — UI untuk encrypted export/import koleksi Petikan.
 *
 * Dua mode tab: 'export' (cadangkan) dan 'import' (pulihkan).
 *
 * Export flow:
 *   1. User input passphrase (≥4 char) + konfirmasi
 *   2. exportEncrypted() → Blob
 *   3. Download via <a download> dengan nama petikan-backup-YYYY-MM-DD.json
 *
 * Import flow:
 *   1. User pilih file + input passphrase
 *   2. importEncrypted(file, passphrase)
 *   3. Reload page biar state baru ke-load via loadState
 *
 * Crypto detail di petikanBackup.js (AES-GCM + PBKDF2 via Web Crypto).
 * Referensi mekanik: Tierlist-JKT48 (@MrcellSbst).
 */

import React, { useEffect, useState } from 'react';
import { exportEncrypted, importEncrypted } from '../../lib/petikanBackup';

const todayStamp = () =>
  new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    .replace(/\D/g, '-');

const BackupRestoreModal = ({ onClose }) => {
  const [mode, setMode] = useState('export');
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'busy' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && status !== 'busy') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, status]);

  const reset = () => {
    setPassphrase('');
    setPassphraseConfirm('');
    setFile(null);
    setStatus('idle');
    setMessage('');
  };

  const handleExport = async () => {
    if (passphrase.length < 4) {
      setStatus('error');
      setMessage('Passphrase minimal 4 karakter.');
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setStatus('error');
      setMessage('Konfirmasi passphrase tidak cocok.');
      return;
    }
    setStatus('busy');
    setMessage('Mengenkripsi…');
    try {
      const blob = await exportEncrypted(passphrase);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petikan-backup-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('success');
      setMessage('Backup berhasil di-download.');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Gagal export.');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setStatus('error');
      setMessage('Pilih file backup dulu.');
      return;
    }
    if (passphrase.length < 1) {
      setStatus('error');
      setMessage('Isi passphrase.');
      return;
    }
    setStatus('busy');
    setMessage('Mendekripsi…');
    try {
      const result = await importEncrypted(file, passphrase);
      setStatus('success');
      setMessage(
        `Berhasil pulih ${result.written} entri. Halaman akan reload…`,
      );
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Gagal restore.');
    }
  };

  const switchMode = (next) => {
    if (status === 'busy') return;
    setMode(next);
    reset();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 bg-[color:var(--retro-brown-dark)]/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={status === 'busy' ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cadangkan atau Pulihkan koleksi Petikan"
    >
      <div
        className="relative w-full max-w-md bg-[color:var(--retro-cream,#faf6ed)] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(140,100,60,0.025) 0 1px, transparent 1px 8px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[color:var(--retro-brown-dark)]/10">
          <p className="text-[9px] uppercase tracking-[0.4em] text-[color:var(--retro-burgundy)] mb-1">
            Petikan
          </p>
          <h3
            className="text-xl text-[color:var(--retro-brown-dark)] leading-tight"
            style={{ fontFamily: '"Fraunces Variable", serif', fontWeight: 600 }}
          >
            Cadangkan & Pulihkan
          </h3>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-4 flex gap-2">
          {[
            { id: 'export', label: 'Cadangkan', icon: 'ri-download-line' },
            { id: 'import', label: 'Pulihkan', icon: 'ri-upload-line' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id)}
              disabled={status === 'busy'}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition disabled:opacity-50 ${
                mode === tab.id
                  ? 'bg-[color:var(--retro-burgundy)] text-white shadow-sm'
                  : 'bg-white/70 text-[color:var(--retro-brown-dark)]/70 hover:bg-[color:var(--retro-burgundy)]/10 border border-[color:var(--retro-brown-dark)]/10'
              }`}
            >
              <i className={`${tab.icon} text-sm`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-3">
          {mode === 'export' ? (
            <>
              <p className="text-xs text-[color:var(--retro-brown-dark)]/65 italic leading-relaxed">
                Buat passphrase untuk mengunci backup. Simpan baik-baik —
                tanpa passphrase, backup tidak bisa dipulihkan.
              </p>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/80">
                  Passphrase
                </span>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={status === 'busy'}
                  className="mt-1 w-full px-3 py-2 rounded-md bg-white/70 border border-[color:var(--retro-brown-dark)]/15 text-sm text-[color:var(--retro-brown-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40 disabled:opacity-50"
                  placeholder="minimal 4 karakter"
                  autoComplete="new-password"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/80">
                  Konfirmasi
                </span>
                <input
                  type="password"
                  value={passphraseConfirm}
                  onChange={(e) => setPassphraseConfirm(e.target.value)}
                  disabled={status === 'busy'}
                  className="mt-1 w-full px-3 py-2 rounded-md bg-white/70 border border-[color:var(--retro-brown-dark)]/15 text-sm text-[color:var(--retro-brown-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40 disabled:opacity-50"
                  placeholder="ulangi passphrase"
                  autoComplete="new-password"
                />
              </label>
              <button
                type="button"
                onClick={handleExport}
                disabled={status === 'busy' || !passphrase || !passphraseConfirm}
                className="w-full mt-2 px-4 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-white text-[11px] font-bold uppercase tracking-[0.25em] shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-download-line mr-1.5" />
                Cadangkan sekarang
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-[color:var(--retro-brown-dark)]/65 italic leading-relaxed">
                Pulihkan koleksi dari file backup. Data sekarang akan
                ditimpa — pastikan passphrase benar.
              </p>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/80">
                  File backup (.json)
                </span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={status === 'busy'}
                  className="mt-1 w-full text-xs text-[color:var(--retro-brown-dark)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:uppercase file:tracking-[0.2em] file:font-bold file:bg-[color:var(--retro-burgundy)] file:text-white file:cursor-pointer hover:file:opacity-90 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)]/80">
                  Passphrase
                </span>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={status === 'busy'}
                  className="mt-1 w-full px-3 py-2 rounded-md bg-white/70 border border-[color:var(--retro-brown-dark)]/15 text-sm text-[color:var(--retro-brown-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--retro-burgundy)]/40 disabled:opacity-50"
                  placeholder="passphrase saat backup"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="button"
                onClick={handleImport}
                disabled={status === 'busy' || !file || !passphrase}
                className="w-full mt-2 px-4 py-2.5 rounded-full bg-[color:var(--retro-burgundy)] text-white text-[11px] font-bold uppercase tracking-[0.25em] shadow-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-upload-line mr-1.5" />
                Pulihkan sekarang
              </button>
            </>
          )}

          {/* Status line */}
          {message && (
            <p
              className={`text-[11px] leading-relaxed pt-1 ${
                status === 'error'
                  ? 'text-[color:var(--retro-burgundy)]'
                  : status === 'success'
                    ? 'text-[#5a7a3a]'
                    : 'text-[color:var(--retro-brown-dark)]/65'
              }`}
            >
              <i
                className={`mr-1 ${
                  status === 'error'
                    ? 'ri-error-warning-line'
                    : status === 'success'
                      ? 'ri-check-line'
                      : 'ri-loader-4-line animate-spin'
                }`}
              />
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={status === 'busy'}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-[color:var(--retro-brown-dark)] hover:bg-[color:var(--retro-burgundy)] hover:text-white transition disabled:opacity-50"
          aria-label="Tutup cadangkan & pulihkan"
        >
          <i className="ri-close-line text-xl" />
        </button>
      </div>
    </div>
  );
};

export default BackupRestoreModal;
