import { AuthChangeEvent, createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'MY_SUPABASE_URL' &&
  supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY'
);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const authService = {
  isConfigured(): boolean {
    return supabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signIn(email: string, password: string): Promise<User> {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No se pudo iniciar sesión.');
    return data.user;
  },

  async signUp(email: string, password: string): Promise<User | null> {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (!supabase) throw new Error('Supabase no está configurado.');

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async updatePassword(password: string): Promise<void> {
    if (!supabase) throw new Error('Supabase no está configurado.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (session: Session | null, event: AuthChangeEvent) => void) {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(session, event));
    return () => data.subscription.unsubscribe();
  },
};
