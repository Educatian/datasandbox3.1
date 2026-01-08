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

const ADMIN_EMAIL = 'jewoong.moon@gmail.com';

/**
 * Idempotently seeds the admin role for the specified email.
 * Strategy:
 * 1. Check user_metadata.role.
 * 2. If present, do nothing.
 * 3. If missing, try to update user_metadata.
 * 4. If update fails (e.g. RLS), try insert into public.user_roles (Plan B).
 */
const seedAdminRole = async (user: User) => {
    if (user.email !== ADMIN_EMAIL) return;

    // 1. Check metadata
    if (user.user_metadata?.role === 'admin') {
        return; // Already seeded
    }

    console.log('Seeding Admin Role for:', user.email);

    // 2. Try update metadata (Plan A)
    const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'admin' }
    });

    if (!updateError) {
        console.log('Admin role seeded via user_metadata');
        return;
    }

    console.warn('Metadata update failed (likely RLS), attempting Plan B (user_roles table)...', updateError.message);

    // 3. Plan B: Insert into user_roles
    // Check if row exists first to be safe/idempotent
    const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (existingRole?.role === 'admin') return;

    const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: user.id, role: 'admin' }]);

    if (insertError) {
        console.error('Plan B failed: Could not seed admin role in user_roles table.', insertError);
    } else {
        console.log('Admin role seeded via user_roles table');
    }
};

/**
 * Checks if the user is an admin.
 * Checks both user_metadata (Plan A) and public.user_roles (Plan B).
 */
export const isAdmin = async (user: User | null): Promise<boolean> => {
    if (!user) return false;

    // Plan A: Metadata
    if (user.user_metadata?.role === 'admin') return true;

    // Plan B: Table
    const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

    return !!data;
};

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { user: data.user, session: data.session, error };
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (data.user) {
        // Seed on sign in success
        await seedAdminRole(data.user);
    }

    return { user: data.user, error };
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
    return supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;
        if (user) {
            // Seed on any auth state change (restore session, refresh, etc.)
            await seedAdminRole(user);
        }
        callback(user, session);
    });
};
