import { createClient, User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

// Create a placeholder client if not configured (to prevent errors)
export const supabase: SupabaseClient = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Auth types
export interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { user: data.user, error };
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { user: data.user, error };
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });
    return { error };
};

// Sign in with GitHub
export const signInWithGitHub = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin,
        },
    });
    return { error };
};

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Get current session
export const getSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: User | null, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, session);
    });
};
