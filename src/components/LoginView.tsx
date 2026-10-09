import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Search, KeyRound } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginViewProps {
  onAuthenticated: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        await authService.signIn(email.trim(), password);
        onAuthenticated();
      } else if (mode === 'signup') {
        const user = await authService.signUp(email.trim(), password);
        if (user) {
          setMessage('Cuenta creada. Si tu proyecto exige confirmación por email, revisá tu correo antes de ingresar.');
          setMode('login');
        }
      } else {
        await authService.requestPasswordReset(email.trim());
        setMessage('Te enviamos un enlace para crear una nueva contraseña. Revisá tu correo.');
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo completar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-10 items-stretch">
        <section className="hidden lg:flex min-h-[620px] rounded-[2rem] bg-slate-950 text-white p-10 xl:p-12 flex-col justify-between overflow-hidden relative shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.35),transparent_28rem),radial-gradient(circle_at_85%_75%,rgba(13,148,136,0.18),transparent_24rem)]"></div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-200 tracking-[0.14em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Visibility Intelligence
            </div>
            <h2 className="mt-8 max-w-3xl text-5xl xl:text-6xl font-heading font-bold leading-[0.98] tracking-[-0.04em] text-balance">
              Entendé dónde aparece tu negocio y qué mejorar primero.
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 text-pretty">
              Unificamos auditoría técnica, Search Console, oportunidades y evolución en una lectura clara para decidir sin perderse en métricas.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            {['SEO real', 'Search Console', 'Oportunidades'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-4">
                <span className="text-xs font-semibold text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="vai-shell self-center">
          <section className="vai-core vai-panel rounded-[1.4rem] p-6 sm:p-8 lg:p-9">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[1rem] bg-slate-950 text-white flex items-center justify-center shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Visibility AI</h1>
            <p className="text-xs text-slate-500">Acceso seguro a tu cuenta</p>
          </div>
        </div>

        {mode !== 'forgot' && (
        <div className="grid grid-cols-2 gap-1.5 mt-7 p-1.5 bg-slate-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mode === 'login' ? 'bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.06)]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mode === 'signup' ? 'bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.06)]' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Crear cuenta
          </button>
        </div>
        )}

        {mode === 'forgot' && (
          <div className="mt-7 rounded-2xl bg-slate-50/70 ring-1 ring-slate-200/70 p-4">
            <p className="text-xs font-semibold text-slate-900">Recuperar acceso</p>
            <p className="mt-1 text-[11px] text-slate-500 leading-5">
              Ingresá el email de tu cuenta y te enviaremos un enlace seguro para definir una nueva contraseña.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              placeholder="nombre@empresa.com"
            />
          </div>

          {mode !== 'forgot' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'login' && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setMessage('');
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Olvidé mi contraseña
                </button>
              </div>
            )}
          </div>
          )}

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          {message && <p className="text-xs font-semibold text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="group w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985]"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            {loading
              ? 'Procesando...'
              : mode === 'login'
              ? 'Ingresar'
              : mode === 'signup'
              ? 'Crear cuenta'
              : 'Enviar enlace'}
          </button>
        </form>

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
            className="mt-4 w-full text-[11px] font-semibold text-slate-500 hover:text-slate-900"
          >
            Volver al inicio de sesión
          </button>
        )}

        <p className="mt-5 text-[11px] text-slate-400 leading-relaxed text-center">
          Cada cuenta mantiene separados sus negocios, auditorías e historial dentro de su propio workspace.
        </p>
          </section>
        </div>
      </div>
    </main>
  );
};
