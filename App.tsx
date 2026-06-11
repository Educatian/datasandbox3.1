import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { User } from '@supabase/supabase-js';
import { setUser, setPage, logEvent, logLogin, logLogout } from './services/loggingService';
import { supabase, isSupabaseConfigured, getSession, onAuthStateChange, signOut, isAdmin } from './services/supabaseService';
import { GlobalClickLogger } from './components/GlobalClickLogger';
import LoginPage from './components/LoginPage';
import CurriculumView from './components/CurriculumView';
import { ALL_TRACKS, getModuleDef, ModuleDef, MODULE_SCENARIOS, DEMO_MODULE_IDS } from './curriculum';
import { MODULE_REGISTRY } from './components/moduleRegistry';
import ModuleErrorBoundary from './components/ui/ModuleErrorBoundary';
import { isMuted, setMuted } from './services/soundService';
import { isTourDone } from './components/OnboardingTour';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ProgressView = lazy(() => import('./components/ProgressView'));
const LabNotebookView = lazy(() => import('./components/LabNotebookView'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));

const LoadingScreen: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" role="status">
        <div className="text-center">
            {/* Animated bead-curve logo; static logo with pulse for reduced motion */}
            <video
                className="w-28 h-28 mx-auto mb-4 rounded-3xl object-cover shadow-lg shadow-violet-500/20 motion-reduce:hidden"
                src="/brand/logo_loading.mp4"
                poster="/brand/logo.webp"
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
            />
            <img
                src="/brand/logo.webp"
                alt=""
                aria-hidden="true"
                className="w-28 h-28 mx-auto mb-4 rounded-3xl animate-pulse hidden motion-reduce:block"
            />
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
    // Public demo mode: ?demo=1 skips the login gate and exposes a curated set
    // of flagship modules as a guest (telemetry logs as the demo guest id, no
    // progress persistence). In dev builds the same flag exposes EVERY module
    // (used by the screencast scripts).
    const DEMO_MODE = typeof window !== 'undefined' && window.location.search.includes('demo=1');
    const LOCAL_BYPASS = import.meta.env.DEV && DEMO_MODE;
    // Deep-linkable module routing: ?module=<id> (works for sharing/LMS links;
    // browser back/forward navigates between portal and modules).
    const [activeModuleId, setActiveModuleIdState] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('module');
    });
    const setActiveModuleId = (id: string | null, pushHistory = true) => {
        setActiveModuleIdState(id);
        if (pushHistory && typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (id) url.searchParams.set('module', id);
            else url.searchParams.delete('module');
            window.history.pushState({ moduleId: id }, '', url);
        }
    };
    useEffect(() => {
        const onPop = () => {
            setActiveModuleIdState(new URLSearchParams(window.location.search).get('module'));
            window.scrollTo(0, 0);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const [soundMuted, setSoundMuted] = useState(isMuted());
    const toggleMute = () => {
        const next = !soundMuted;
        setSoundMuted(next);
        setMuted(next);
    };

    const [showTour, setShowTour] = useState(false);

    // PWA install affordance (Android/desktop Chrome fire beforeinstallprompt;
    // iOS has no event — the guide documents Add to Home Screen instead).
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    useEffect(() => {
        const onBeforeInstall = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const onInstalled = () => {
            setInstallPrompt(null);
            logEvent('pwa_installed', 'App', {});
        };
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);
    const promptInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const choice = await installPrompt.userChoice.catch(() => null);
        logEvent('pwa_install_prompt', 'App', { outcome: choice?.outcome || 'unknown' });
        if (choice?.outcome === 'accepted') setInstallPrompt(null);
    };
    const [user, setUserState] = useState<User | null>(
        DEMO_MODE ? ({ id: 'demo-guest', email: 'demo@guest' } as unknown as User) : null
    );
    const [isAdminState, setIsAdminState] = useState(false);

    const [authLoading, setAuthLoading] = useState(!DEMO_MODE);
    const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({});
    const moduleSettingsRef = useRef<Record<string, any>>({});
    const [exploredModuleIds, setExploredModuleIds] = useState<Set<string>>(new Set());

    // Explored-module summary for portal chips + "next up" suggestion.
    // Server-side aggregate (get_my_module_activity RPC); degrades silently
    // if the RPC has not been applied yet.
    useEffect(() => {
        if (DEMO_MODE || !isSupabaseConfigured || !user) return;
        supabase.rpc('get_my_module_activity').then(({ data, error }) => {
            if (error || !data) return;
            const explored = new Set<string>(
                (data as { page: string; events: number }[])
                    .filter(r => Number(r.events) >= 5)
                    .map(r => r.page)
            );
            setExploredModuleIds(explored);
        });
    }, [user, activeModuleId === null]); // refresh when returning to portal

    // Check for existing session on mount
    useEffect(() => {
        // Demo mode: never touch Supabase auth; log interactions as the guest.
        if (DEMO_MODE) {
            setUser('demo-guest');
            setAuthLoading(false);
            return;
        }
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
        if (DEMO_MODE) return;
        if (user) {
            isAdmin(user).then(setIsAdminState);
        } else {
            setIsAdminState(false);
        }
    }, [user]);

    useEffect(() => {
        // Demo mode: skip Supabase settings. Dev demo exposes everything
        // (screencast scripts); production demo exposes the curated tour.
        if (DEMO_MODE) {
            const all: Record<string, any> = {};
            for (const a of ALL_TRACKS) {
                for (const m of a.modules) {
                    if (LOCAL_BYPASS || DEMO_MODULE_IDS.includes(m.id)) {
                        all[m.id] = { module_id: m.id, visibility_state: 'visible' };
                    }
                }
            }
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

    // First-run tour (once per browser; demo guests see it too)
    useEffect(() => {
        if (user && !isTourDone()) setShowTour(true);
    }, [user]);

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
                    <AdminDashboard curriculum={ALL_TRACKS} onBack={() => setActiveModuleId(null)} preVerifiedAdmin={isAdminState} />
                </Suspense>
            );
        }
        if (activeModuleId === 'my_progress') {
            return (
                <Suspense fallback={<LoadingScreen label="Loading your progress..." />}>
                    <ProgressView
                        userKey={user?.email || user?.id || 'anonymous'}
                        onBack={() => setActiveModuleId(null)}
                        navigateTo={navigateTo}
                    />
                </Suspense>
            );
        }
        if (activeModuleId === 'lab_notebook') {
            return (
                <Suspense fallback={<LoadingScreen label="Opening your lab notebook..." />}>
                    <LabNotebookView
                        userKey={user?.email || user?.id || 'anonymous'}
                        onBack={() => setActiveModuleId(null)}
                        navigateTo={navigateTo}
                        settings={moduleSettings}
                        isAdmin={isAdminState}
                    />
                </Suspense>
            );
        }
        if (!activeModuleId) {
            return <CurriculumView tracks={ALL_TRACKS} navigateTo={navigateTo} settings={moduleSettings} isAdmin={isAdminState} completedModuleIds={exploredModuleIds} />;
        }

        const moduleDef = getModuleDef(activeModuleId);
        if (!moduleDef) {
            return <CurriculumView tracks={ALL_TRACKS} navigateTo={navigateTo} settings={moduleSettings} isAdmin={isAdminState} completedModuleIds={exploredModuleIds} />;
        }

        const onBack = () => setActiveModuleId(null);

        if (moduleDef.component === 'placeholder') {
            return <PlaceholderModule moduleDef={moduleDef} onBack={onBack} />;
        }

        const ModuleComponent = MODULE_REGISTRY[moduleDef.component];
        if (!ModuleComponent) {
            return <PlaceholderModule moduleDef={moduleDef} onBack={onBack} />;
        }

        const scenario = MODULE_SCENARIOS[moduleDef.id];

        return (
            <Suspense fallback={<LoadingScreen label={`Loading ${moduleDef.title}...`} />}>
                {scenario && (
                    <div className="w-full max-w-6xl mx-auto mb-6 bg-gradient-to-r from-violet-950/60 to-slate-900/60 border border-violet-500/30 rounded-2xl px-6 py-4 shadow-lg">
                        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">
                            Your role: <span className="text-violet-200">{scenario.role}</span>
                        </p>
                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{scenario.mission}</p>
                    </div>
                )}
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
                        {DEMO_MODE ? 'Demo Guest' : user.email}
                    </span>
                    {installPrompt && (
                        <button
                            onClick={promptInstall}
                            className="flex items-center gap-1 text-xs font-bold text-cyan-300 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 rounded-full px-3 py-1 transition-colors"
                            title="Install Data Sandbox as an app"
                            aria-label="Install app"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                            Install
                        </button>
                    )}
                    <button
                        onClick={toggleMute}
                        className={`transition-colors p-1 ${soundMuted ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-cyan-300'}`}
                        title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
                        aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
                        aria-pressed={soundMuted}
                    >
                        {soundMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 9l4 6m0-6l-4 6" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
                            </svg>
                        )}
                    </button>
                    {!DEMO_MODE && (
                        <button
                            onClick={() => setActiveModuleId(activeModuleId === 'my_progress' ? null : 'my_progress')}
                            className={`transition-colors p-1 ${activeModuleId === 'my_progress' ? 'text-cyan-300' : 'text-slate-400 hover:text-cyan-300'}`}
                            title="My Progress"
                            aria-label="My progress"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6m4 6V9m4 10V5M5 19h14" />
                            </svg>
                        </button>
                    )}
                    {!DEMO_MODE && (
                        <button
                            onClick={() => setActiveModuleId(activeModuleId === 'lab_notebook' ? null : 'lab_notebook')}
                            className={`transition-colors p-1 ${activeModuleId === 'lab_notebook' ? 'text-amber-300' : 'text-slate-400 hover:text-amber-300'}`}
                            title="Lab Notebook"
                            aria-label="Lab notebook"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={DEMO_MODE ? () => { window.location.href = window.location.pathname; } : handleLogout}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        title={DEMO_MODE ? 'Exit demo' : 'Sign Out'}
                        aria-label={DEMO_MODE ? 'Exit demo' : 'Sign out'}
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

            <GlobalClickLogger userId={DEMO_MODE ? 'demo-guest' : (user?.email || user?.id || 'anonymous')} page={activeModuleId || 'portal'} />

            {/* Demo mode banner */}
            {DEMO_MODE && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-violet-950/90 backdrop-blur-sm border border-violet-500/40 rounded-full px-5 py-2 shadow-2xl whitespace-nowrap max-w-[94vw]">
                    <span className="text-xs text-violet-200">
                        <span className="font-bold uppercase tracking-wider">Demo</span>
                        <span className="hidden sm:inline ml-2">A guided taste of the sandbox. Progress is not saved.</span>
                    </span>
                    <button
                        onClick={() => { window.location.href = window.location.pathname; }}
                        className="text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-full px-3 py-1 transition-colors"
                    >
                        Sign in for everything
                    </button>
                </div>
            )}

            {showTour && (
                <Suspense fallback={null}>
                    <OnboardingTour onDone={() => setShowTour(false)} />
                </Suspense>
            )}

            <ModuleErrorBoundary moduleId={activeModuleId || 'portal'} onBack={() => setActiveModuleId(null)}>
                {renderPage()}
            </ModuleErrorBoundary>
            <footer className="text-center text-slate-600 mt-24 pb-8 w-full border-t border-slate-800/50 pt-8">
                <p className="font-medium">Data Sandbox 2.0</p>
                <p className="mt-2 text-sm">
                    Designed for Interactive Learning · <a href="/guide/index.html" className="text-slate-500 hover:text-cyan-400 underline decoration-dotted transition-colors">User Guide</a>
                </p>
            </footer>
        </div>
    );
};

export default App;
