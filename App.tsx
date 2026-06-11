import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { User } from '@supabase/supabase-js';
import { setUser, setPage, logEvent, logLogin, logLogout } from './services/loggingService';
import { supabase, isSupabaseConfigured, getSession, onAuthStateChange, signOut, isAdmin } from './services/supabaseService';
import { GlobalClickLogger } from './components/GlobalClickLogger';
import LoginPage from './components/LoginPage';
import CurriculumView from './components/CurriculumView';
import { CURRICULUM, getModuleDef, ModuleDef } from './curriculum';
import { MODULE_REGISTRY } from './components/moduleRegistry';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const LoadingScreen: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" role="status">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">{label}</p>
        </div>
    </div>
);

const PlaceholderModule: React.FC<{ moduleDef: ModuleDef; onBack: () => void }> = ({ moduleDef, onBack }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center max-w-3xl mx-auto px-4">
        <button onClick={onBack} className="self-start text-cyan-400 hover:text-cyan-300 mb-8 flex items-center">
            <span className="mr-2" aria-hidden="true">&larr;</span> Back to Curriculum
        </button>

        <h1 className="text-5xl font-bold text-slate-200 mb-4">{moduleDef.title}</h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">{moduleDef.description}</p>

        <div className="bg-slate-800 p-10 rounded-2xl border border-dashed border-slate-600 w-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"></div>

            <div className="relative z-10">
                <div className="text-7xl mb-6 animate-pulse">🚧</div>
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Concept Visualization Under Construction</h2>

                <div className="bg-slate-900/80 p-6 rounded-xl text-left border border-slate-700/50 shadow-xl max-w-lg mx-auto">
                    <p className="text-xs text-cyan-500 uppercase font-bold mb-2 tracking-wider">Intended Hands-on Activity:</p>
                    <p className="text-lg text-slate-300 italic leading-relaxed">"{moduleDef.manipulation}"</p>
                </div>

                <p className="mt-8 text-slate-500 text-sm">
                    This module is currently in the conceptual phase. The interactive component described above is planned for future updates.
                </p>
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    // Dev-only screencast bypass: ?demo=1 skips the Supabase login gate so modules
    // can be captured without credentials. Guarded by import.meta.env.DEV, so
    // production builds never honor it.
    const LOCAL_BYPASS = import.meta.env.DEV && typeof window !== 'undefined' && window.location.search.includes('demo=1');
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [user, setUserState] = useState<User | null>(
        LOCAL_BYPASS ? ({ id: 'local-demo', email: 'demo@local.dev' } as unknown as User) : null
    );
    const [isAdminState, setIsAdminState] = useState(false);

    const [authLoading, setAuthLoading] = useState(!LOCAL_BYPASS);
    const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({});
    const moduleSettingsRef = useRef<Record<string, any>>({});

    // Check for existing session on mount
    useEffect(() => {
        // Local screencast bypass: never touch Supabase auth.
        if (LOCAL_BYPASS) { setAuthLoading(false); return; }
        // If Supabase is not configured, show login page immediately
        if (!isSupabaseConfigured) {
            setAuthLoading(false);
            return;
        }

        const checkSession = async () => {
            try {
                const session = await getSession();
                setUserState(session?.user || null);
                if (session?.user) {
                    setUser(session.user.email || session.user.id);
                    logLogin(session.user.email || session.user.id, 'session_restore');
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
            setAuthLoading(false);
        };
        checkSession();

        const { data: { subscription } } = onAuthStateChange((user, session) => {
            setUserState(user);
            if (user) {
                setUser(user.email || user.id);
                logLogin(user.email || user.id, 'auth_state_change');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (LOCAL_BYPASS) return;
        if (user) {
            isAdmin(user).then(setIsAdminState);
        } else {
            setIsAdminState(false);
        }
    }, [user]);

    useEffect(() => {
        // Local screencast bypass: mark every module visible (skip Supabase).
        if (LOCAL_BYPASS) {
            const all: Record<string, any> = {};
            for (const a of CURRICULUM) for (const m of a.modules) all[m.id] = { module_id: m.id, visibility_state: 'visible' };
            setModuleSettings(all);
            return;
        }
        // Fetch module settings for everyone (RLS allows reading)
        const fetchSettings = async () => {
            const { data } = await supabase.from('module_settings').select('*');
            if (data) {
                const map: Record<string, any> = {};
                data.forEach((s: any) => map[s.module_id] = s);
                setModuleSettings(map);
                moduleSettingsRef.current = map; // Sync ref
            }
        };
        fetchSettings();

        // Subscribe to changes
        const channel = supabase
            .channel('public:module_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'module_settings' }, (payload) => {
                const newSetting = payload.new as any;
                setModuleSettings(prev => {
                    const updated = { ...prev, [newSetting.module_id]: newSetting };
                    moduleSettingsRef.current = updated; // Sync ref
                    return updated;
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Auto-release scheduled modules when their time arrives (timer-based only)
    useEffect(() => {
        const checkScheduledReleases = async () => {
            const now = new Date();
            // Use ref to get latest settings (avoids stale closure)
            const currentSettings = moduleSettingsRef.current;

            for (const [moduleId, setting] of Object.entries(currentSettings) as [string, any][]) {
                if (setting.visibility_state === 'scheduled' && setting.release_at) {
                    const releaseTime = new Date(setting.release_at);
                    // Only auto-release if the time has passed AND release_at is within last 24 hours
                    // (prevents ancient scheduled dates from triggering on every load)
                    const hoursSinceRelease = (now.getTime() - releaseTime.getTime()) / (1000 * 60 * 60);
                    if (releaseTime <= now && hoursSinceRelease < 24) {
                        console.log(`Auto-releasing module: ${moduleId}`);
                        await supabase.from('module_settings').update({
                            visibility_state: 'visible',
                            updated_at: now.toISOString()
                        }).eq('module_id', moduleId);
                    }
                }
            }
        };

        // Only check on interval (every 60 seconds), not on settings change
        const interval = setInterval(checkScheduledReleases, 60000);
        return () => clearInterval(interval);
    }, []); // Empty dependency - runs once on mount, timer handles the rest

    useEffect(() => {
        setPage(activeModuleId || 'portal');
    }, [activeModuleId]);

    const handleLogout = async () => {
        logLogout();
        await signOut();
        setUserState(null);
        setActiveModuleId(null);
    };

    const navigateTo = (moduleId: string) => {
        logEvent('navigate', 'Portal', { destination: moduleId });
        setActiveModuleId(moduleId);
        window.scrollTo(0, 0);
    };

    const renderPage = () => {
        if (activeModuleId === 'admin_dashboard') {
            return (
                <Suspense fallback={<LoadingScreen label="Loading dashboard..." />}>
                    <AdminDashboard curriculum={CURRICULUM} onBack={() => setActiveModuleId(null)} preVerifiedAdmin={isAdminState} />
                </Suspense>
            );
        }
        if (!activeModuleId) {
            return <CurriculumView tracks={CURRICULUM} navigateTo={navigateTo} settings={moduleSettings} isAdmin={isAdminState} />;
        }

        const moduleDef = getModuleDef(activeModuleId);
        if (!moduleDef) {
            return <CurriculumView tracks={CURRICULUM} navigateTo={navigateTo} settings={moduleSettings} isAdmin={isAdminState} />;
        }

        const onBack = () => setActiveModuleId(null);

        if (moduleDef.component === 'placeholder') {
            return <PlaceholderModule moduleDef={moduleDef} onBack={onBack} />;
        }

        const ModuleComponent = MODULE_REGISTRY[moduleDef.component];
        if (!ModuleComponent) {
            return <PlaceholderModule moduleDef={moduleDef} onBack={onBack} />;
        }

        return (
            <Suspense fallback={<LoadingScreen label={`Loading ${moduleDef.title}...`} />}>
                <ModuleComponent
                    onBack={onBack}
                    customTitle={moduleDef.title}
                    customContext={moduleDef.manipulation}
                    moduleId={moduleDef.id}
                />
            </Suspense>
        );
    };

    // Show loading state while checking auth
    if (authLoading) {
        return <LoadingScreen />;
    }

    // Show login page if not authenticated
    if (!user) {
        return <LoginPage onLoginSuccess={() => { }} />;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-start p-4 lg:p-8 font-sans">
            {/* User Header */}
            <div className="fixed top-0 right-0 z-50 p-4">
                <div className="flex items-center gap-3 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50 shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-slate-300 hidden sm:block max-w-[150px] truncate">
                        {user.email}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        title="Sign Out"
                        aria-label="Sign out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>

                {isAdminState && (
                    <div className="mt-2 text-right">
                        <button
                            onClick={() => setActiveModuleId(activeModuleId === 'admin_dashboard' ? null : 'admin_dashboard')}
                            className={`${activeModuleId === 'admin_dashboard' ? 'bg-slate-600 hover:bg-slate-500 border-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400'} text-white text-xs px-3 py-1 rounded-full shadow-lg border transition-all font-bold tracking-wider`}
                        >
                            {activeModuleId === 'admin_dashboard' ? '↩ Exit Admin' : '⚡ Admin Dashboard'}
                        </button>
                    </div>
                )}
            </div>

            <GlobalClickLogger userId={user?.email || user?.id || 'anonymous'} page={activeModuleId || 'portal'} />
            {renderPage()}
            <footer className="text-center text-slate-600 mt-24 pb-8 w-full border-t border-slate-800/50 pt-8">
                <p className="font-medium">Data Sandbox 2.0</p>
                <p className="mt-2 text-sm">Designed for Interactive Learning</p>
            </footer>
        </div>
    );
};

export default App;
