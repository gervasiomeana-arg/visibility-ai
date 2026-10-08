import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Search } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginViewProps {
  onAuthenticated: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
      } else {
        const user = await authService.signUp(email.trim(), password);
        if (user) {
          setMessage('Cuenta creada. Si tu proyecto exige confirmación por email, revisá tu correo antes de ingresar.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo completar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Visibility AI</h1>
            <p className="text-xs text-slate-500">Acceso seguro a tu cuenta</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`px-3 py-2 rounded-lg text-xs font-bold ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-3 py-2 rounded-lg text-xs font-bold ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="nombre@empresa.com"
            />
          </div>

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
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
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
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          {message && <p className="text-xs font-semibold text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-slate-400 text-center">
          Cada cuenta tendrá sus propios negocios, auditorías e historial cuando activemos la persistencia multi-tenant.
        </p>
      </div>
    </div>
  );
};
