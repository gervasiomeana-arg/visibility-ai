import React, { useState } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';

interface PasswordResetViewProps {
  onComplete: () => void;
}

export const PasswordResetView: React.FC<PasswordResetViewProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await authService.updatePassword(password);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] px-4 py-10 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg vai-shell">
        <section className="vai-core vai-panel p-6 sm:p-8">
          <div className="w-11 h-11 rounded-[1rem] bg-slate-950 text-white flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>

          <h1 className="mt-5 text-2xl font-heading font-bold text-slate-950">
            Crear nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-6">
            Elegí una nueva clave para tu cuenta de Visibility AI.
          </p>

          {done ? (
            <div className="mt-6">
              <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-4 text-sm text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Contraseña actualizada.</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Ya podés continuar con tu cuenta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onComplete}
                className="mt-5 w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Continuar
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repetir contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:ring-indigo-300"
                />
              </div>

              {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold"
              >
                {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};
