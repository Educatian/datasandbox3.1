import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { setUser, setPage, logEvent, logLogin, logLogout } from './services/loggingService';
import { supabase, isSupabaseConfigured, getSession, onAuthStateChange, signIn, signOut, isAdmin } from './services/supabaseService';
import { GlobalClickLogger } from './components/GlobalClickLogger';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ZTestAnalysis from './components/ZTestAnalysis';
import RegressionAnalysis from './components/RegressionAnalysis';
import ConfidenceIntervalAnalysis from './components/ConfidenceIntervalAnalysis';
import CorrelationAnalysis from './components/CorrelationAnalysis';
import DataSorterGame from './components/DataSorterGame';
import GodModeSwitch from './components/GodModeSwitch';
import SummationMachine from './components/SummationMachine';
import RankLine from './components/RankLine';
import BalanceBeam from './components/BalanceBeam';
import DartBoard from './components/DartBoard';
import CoinFlipper from './components/CoinFlipper';
import SignalNoiseRadio from './components/SignalNoiseRadio';
import EffectSizeMagnifier from './components/EffectSizeMagnifier';
import PredictionLaser from './components/PredictionLaser';
import BoxPlotBuilder from './components/BoxPlotBuilder';
import ModeVisualizer from './components/ModeVisualizer';
import GaltonBoard from './components/GaltonBoard';
import PHackingSim from './components/PHackingSim';
import AnscombeQuartet from './components/AnscombeQuartet';

//================================================
// Curriculum Data Structure
//================================================

interface ModuleDef {
    id: string;
    title: string;
    description: string;
    manipulation: string;
    component: 'z-test' | 'regression' | 'correlation' | 'confidence' | 'game' | 'god-mode' | 'summation' | 'rank-line' | 'balance-beam' | 'dart-board' | 'coin-flipper' | 'signal-noise' | 'effect-magnifier' | 'prediction-laser' | 'box-plot' | 'mode-viz' | 'galton-board' | 'p-hacking' | 'anscombe' | 'placeholder';
}

interface AssessmentDef {
    id: string;
    title: string;
    subTitle: string;
    modules: ModuleDef[];
}

const CURRICULUM: AssessmentDef[] = [
    {
        id: 'assessment-01',
        title: 'The Foundation',
        subTitle: 'Mathematical symbols → Concrete objects',
        modules: [
            {
                id: 'data-sorter', title: 'The Data Sorter',
                description: 'Sort data capsules into Nominal, Ordinal, Interval, Ratio pipes.',
                manipulation: 'Drag floating data capsules to the correct measurement scale pipe.',
                component: 'game'
            },
            {
                id: 'god-mode', title: 'The God Mode Switch',
                description: 'Experimental vs. Observational studies.',
                manipulation: 'Toggle between Observational (locked) and Experimental (adjustable) modes to see causality.',
                component: 'god-mode'
            },
            {
                id: 'summation-machine', title: 'The Summation Machine',
                description: 'Visualizing Sigma notation.',
                manipulation: 'Dial the range i=1 to n=4 and watch numbers get sucked into the machine.',
                component: 'summation'
            }
        ]
    },
    {
        id: 'assessment-02',
        title: 'Visualization',
        subTitle: 'Data as Shape, not just numbers',
        modules: [
            {
                id: 'bin-squeezer', title: 'The Bin Squeezer',
                description: 'Histogram bin widths and distortion.',
                manipulation: 'Squeeze the bin width slider to see the histogram change shape from detailed to blocky.',
                component: 'z-test' // Using Z-Test distribution view as proxy
            },
            {
                id: 'rank-line', title: 'The Rank Line',
                description: 'Percentiles and Quartiles.',
                manipulation: 'Place a flag at the 75th percentile to highlight the top quartile.',
                component: 'rank-line'
            },
            {
                id: 'box-plot', title: 'The Box Plot Packer',
                description: 'Median, IQR, and Whiskers.',
                manipulation: 'Drag data points to reshape the Box & Whisker plot in real-time.',
                component: 'box-plot'
            }
        ]
    },
    {
        id: 'assessment-03',
        title: 'Central Tendency',
        subTitle: 'Sensitivity of statistics',
        modules: [
            {
                id: 'balance-beam', title: 'The Balance Beam',
                description: 'Mean vs. Median sensitivity.',
                manipulation: 'Throw a weight (outlier) far to the side and watch the fulcrum (Mean) shift while the Median stays put.',
                component: 'balance-beam'
            },
            {
                id: 'dart-board', title: 'The Dart Board',
                description: 'Standard Deviation as spread.',
                manipulation: 'Turn the "Spread" dial to see shots scatter (High SD) or cluster (Low SD).',
                component: 'dart-board'
            },
            {
                id: 'mode-viz', title: 'The Mode Magnet',
                description: 'Mode as the most frequent value.',
                manipulation: 'Stack blocks to build the tallest tower.',
                component: 'mode-viz'
            }
        ]
    },
    {
        id: 'assessment-04',
        title: 'Normal Distribution',
        subTitle: 'Probability as Area',
        modules: [
            {
                id: 'prob-scanner', title: 'The Probability Scanner',
                description: 'Z-Scores and Area under the curve.',
                manipulation: 'Drag the laser scanner across the curve to paint the area and calculate probability.',
                component: 'z-test'
            },
            {
                id: 'sample-pumper', title: 'The Sample Size Pumper',
                description: 'Sampling Distribution & Standard Error.',
                manipulation: 'Pump the sample size (n) from 5 to 100 and watch the distribution sharpen.',
                component: 'confidence'
            },
            {
                id: 'galton-board', title: 'The Galton Board',
                description: 'Central Limit Theorem.',
                manipulation: 'Drop balls through pegs to see them naturally form a Bell Curve.',
                component: 'galton-board'
            }
        ]
    },
    {
        id: 'assessment-05',
        title: 'Hypothesis Testing',
        subTitle: 'Decision and Risk',
        modules: [
            {
                id: 'coin-flipper', title: 'The Coin Flipper',
                description: 'Null Hypothesis & P-Values.',
                manipulation: 'Flip a coin repeatedly. If you get 10 heads in a row, the "P-Value Meter" drops into the rejection zone.',
                component: 'coin-flipper'
            },
            {
                id: 'radar-detector', title: 'The Radar Detector',
                description: 'Type I & Type II Errors.',
                manipulation: 'Move the detection threshold (Alpha) to balance False Alarms vs. Missed Signals.',
                component: 'z-test'
            },
            {
                id: 'p-hacking', title: 'The P-Hacking Fisher',
                description: 'Multiple Comparisons Problem.',
                manipulation: 'Run 20 random experiments at once. See how easy it is to find a "significant" result by chance.',
                component: 'p-hacking'
            }
        ]
    },
    {
        id: 'assessment-06',
        title: 'One-Sample t-Test',
        subTitle: 'Uncertainty in small samples',
        modules: [
            {
                id: 'signal-noise', title: 'The Signal-to-Noise Radio',
                description: 'The t-statistic formula visualized.',
                manipulation: 'Increase the Signal (Mean Diff) or reduce the Noise (Std Error) to get a clear t-value reception.',
                component: 'signal-noise'
            },
            {
                id: 'tail-stretcher', title: 'The Tail Stretcher',
                description: 't-distribution vs. Z-distribution.',
                manipulation: 'Lower sample size (n) to see the distribution tails get fatter and the center drop.',
                component: 'confidence'
            }
        ]
    },
    {
        id: 'assessment-07',
        title: 'Independent t-Test',
        subTitle: 'Difference and Uncertainty',
        modules: [
            {
                id: 'variance-equalizer', title: 'The Variance Equalizer',
                description: 'Homogeneity of Variance.',
                manipulation: 'Adjust the spread of one group. If they differ too much, a warning light triggers.',
                component: 'z-test'
            },
            {
                id: 'overlap-slider', title: 'The Overlap Slider',
                description: 'Mean Difference and p-values.',
                manipulation: 'Drag the two distributions apart. As overlap decreases, watch the t-value rise.',
                component: 'z-test'
            }
        ]
    },
    {
        id: 'assessment-08',
        title: 'Power & Effect Size',
        subTitle: 'Designing for Success',
        modules: [
            {
                id: 'power-triangle', title: 'The Power Triangle',
                description: 'G*Power relationships.',
                manipulation: 'Adjust Alpha, Sample Size, and Effect Size to maximize the "Power" area.',
                component: 'z-test'
            },
            {
                id: 'effect-magnifier', title: 'The Effect Size Magnifier',
                description: 'Visualizing Effect Size as Contrast.',
                manipulation: 'Adjust contrast (Effect Size) and density (Sample Size) to detect the difference between two particle clouds.',
                component: 'effect-magnifier'
            }
        ]
    },
    {
        id: 'assessment-09',
        title: 'Correlation',
        subTitle: 'Pattern Seeking',
        modules: [
            {
                id: 'correlation-maker', title: 'The Correlation Maker',
                description: 'Pearson’s r and Outliers.',
                manipulation: 'Click to add points. Add an outlier to crash the r-value.',
                component: 'correlation'
            },
            {
                id: 'prediction-laser', title: 'The Prediction Laser',
                description: 'Correlation as Precision of Control.',
                manipulation: 'Move the input slider. High correlation means the laser output follows precisely; low correlation means it jitters wildly.',
                component: 'prediction-laser'
            },
            {
                id: 'anscombe', title: 'The Anscombe Quartet',
                description: 'The importance of visualization.',
                manipulation: 'Switch between 4 datasets that look completely different but have identical statistics.',
                component: 'anscombe'
            }
        ]
    },
    {
        id: 'assessment-10',
        title: 'Regression',
        subTitle: 'Prediction and Error',
        modules: [
            {
                id: 'residual-rain', title: 'The Residual Rain',
                description: 'Regression Line & Least Squares.',
                manipulation: 'Tilt the line manually. Watch the "rain" (residuals) minimize at the best fit.',
                component: 'regression'
            },
            {
                id: 'prediction-painter', title: 'The Prediction Painter',
                description: 'R-squared and Explained Variance.',
                manipulation: 'Tighten the points to the line to fill the R-squared gauge.',
                component: 'regression'
            }
        ]
    }
];

//================================================
// Theme Configuration
//================================================

const SECTION_THEMES = [
    {
        titleColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/30',
        bgColor: 'bg-cyan-500/5',
        accentColor: 'text-cyan-400',
        hoverBorder: 'hover:border-cyan-400',
        icon: 'text-cyan-500/20'
    },
    {
        titleColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        bgColor: 'bg-emerald-500/5',
        accentColor: 'text-emerald-400',
        hoverBorder: 'hover:border-emerald-400',
        icon: 'text-emerald-500/20'
    },
    {
        titleColor: 'text-violet-400',
        borderColor: 'border-violet-500/30',
        bgColor: 'bg-violet-500/5',
        accentColor: 'text-violet-400',
        hoverBorder: 'hover:border-violet-400',
        icon: 'text-violet-500/20'
    },
    {
        titleColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/5',
        accentColor: 'text-amber-400',
        hoverBorder: 'hover:border-amber-400',
        icon: 'text-amber-500/20'
    },
    {
        titleColor: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        bgColor: 'bg-rose-500/5',
        accentColor: 'text-rose-400',
        hoverBorder: 'hover:border-rose-400',
        icon: 'text-rose-500/20'
    }
];

//================================================
// Curriculum View
//================================================

const CurriculumView: React.FC<{ navigateTo: (moduleId: string) => void, settings: Record<string, any> | null, isAdmin: boolean }> = ({ navigateTo, settings, isAdmin }) => {
    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="text-center mb-16 pt-8">
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 font-game tracking-tight filter drop-shadow-lg">
                    Data Sandbox
                </h1>
                <p className="text-slate-400 mt-4 text-xl font-light tracking-wide">
                    Interactive Statistics Curriculum
                </p>
            </header>

            <div className="space-y-16">
                {CURRICULUM.map((assessment, index) => {
                    const theme = SECTION_THEMES[index % SECTION_THEMES.length];

                    return (
                        <div key={assessment.id} className={`relative rounded-3xl p-8 border ${theme.borderColor} ${theme.bgColor} backdrop-blur-sm`}>
                            <div className="absolute -top-5 left-8 px-4 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {assessment.title}
                            </div>

                            <div className="mb-8 pl-2">
                                <h2 className={`text-3xl font-bold ${theme.titleColor} mb-1`}>{assessment.title}</h2>
                                <p className="text-slate-400 text-sm uppercase tracking-widest font-medium opacity-80">{assessment.subTitle}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assessment.modules.map((mod) => {
                                    // Visibility Logic
                                    const setting = settings?.[mod.id];
                                    const state = setting?.visibility_state || 'hidden'; // Default to hidden
                                    const releaseAt = setting?.release_at ? new Date(setting.release_at) : null;
                                    const isScheduledReleased = releaseAt ? new Date() >= releaseAt : false;

                                    const isVisible = isAdmin
                                        || state === 'visible'
                                        || (state === 'scheduled' && isScheduledReleased);

                                    // If hidden for student, don't render
                                    if (!isVisible) return null;

                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => navigateTo(mod.id)}
                                            className={`text-left bg-slate-800/80 hover:bg-slate-800 p-6 rounded-xl border border-slate-700/50 ${theme.hoverBorder} transition-all duration-300 group relative overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1`}
                                        >
                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className={`text-lg font-bold ${theme.accentColor} group-hover:text-white transition-colors`}>
                                                        {mod.title}
                                                    </h3>
                                                    {isAdmin && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${state === 'visible' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' :
                                                            state === 'scheduled' ? 'bg-amber-900/50 text-amber-400 border-amber-800' :
                                                                'bg-red-900/50 text-red-400 border-red-800'
                                                            }`}>
                                                            {state === 'scheduled' && releaseAt && releaseAt > new Date() ? 'WAITING' : state.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 mb-4 line-clamp-3 flex-grow">
                                                    {mod.description}
                                                </p>
                                                <div className="mt-auto">
                                                    <div className={`text-xs text-slate-500 italic bg-slate-900/50 p-3 rounded border border-slate-700/30`}>
                                                        <span className="font-bold not-italic text-slate-600 mr-1">Activity:</span>
                                                        {mod.manipulation}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Decor element */}
                                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-all opacity-0 group-hover:opacity-20 ${theme.bgColor.replace('/5', '/30')}`}></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

//================================================
// Main App Component
//================================================

const App: React.FC = () => {
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [user, setUserState] = useState<User | null>(null);
    const [isAdminState, setIsAdminState] = useState(false);

    const [authLoading, setAuthLoading] = useState(true);
    const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({});

    // Check for existing session on mount
    useEffect(() => {
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
        if (user) {
            isAdmin(user).then(setIsAdminState);
        } else {
            setIsAdminState(false);
        }
    }, [user]);



    useEffect(() => {
        // Fetch module settings for everyone (RLS allows reading)
        const fetchSettings = async () => {
            const { data } = await supabase.from('module_settings').select('*');
            if (data) {
                const map: Record<string, any> = {};
                data.forEach((s: any) => map[s.module_id] = s);
                setModuleSettings(map);
            }
        };
        fetchSettings();

        // Subscribe to changes
        const channel = supabase
            .channel('public:module_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'module_settings' }, (payload) => {
                const newSetting = payload.new as any;
                setModuleSettings(prev => ({
                    ...prev,
                    [newSetting.module_id]: newSetting
                }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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

    const getModuleDef = (id: string) => {
        for (const assessment of CURRICULUM) {
            const found = assessment.modules.find(m => m.id === id);
            if (found) return found;
        }
        return null;
    };

    const renderPage = () => {
        if (activeModuleId === 'admin_dashboard') return <AdminDashboard curriculum={CURRICULUM} onBack={() => setActiveModuleId(null)} preVerifiedAdmin={isAdminState} />;
        if (!activeModuleId) return <CurriculumView navigateTo={navigateTo} settings={moduleSettings} isAdmin={isAdminState} />;

        const moduleDef = getModuleDef(activeModuleId);
        if (!moduleDef) return <CurriculumView navigateTo={navigateTo} />;

        // --- Custom Components for Specific Modules ---

        if (moduleDef.id === 'data-sorter') {
            return <DataSorterGame onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'god-mode') {
            return <GodModeSwitch onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'summation-machine') {
            return <SummationMachine onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'rank-line') {
            return <RankLine onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'balance-beam') {
            return <BalanceBeam onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'dart-board') {
            return <DartBoard onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'coin-flipper') {
            return <CoinFlipper onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'signal-noise') {
            return <SignalNoiseRadio onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'effect-magnifier') {
            return <EffectSizeMagnifier onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'prediction-laser') {
            return <PredictionLaser onBack={() => setActiveModuleId(null)} />;
        }

        // New Components
        if (moduleDef.id === 'box-plot') {
            return <BoxPlotBuilder onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'mode-viz') {
            return <ModeVisualizer onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'galton-board') {
            return <GaltonBoard onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'p-hacking') {
            return <PHackingSim onBack={() => setActiveModuleId(null)} />;
        }
        if (moduleDef.id === 'anscombe') {
            return <AnscombeQuartet onBack={() => setActiveModuleId(null)} />;
        }

        // --- Generic Wrapper Components ---

        const commonProps = {
            onBack: () => setActiveModuleId(null),
            customTitle: moduleDef.title,
            customContext: moduleDef.manipulation,
            moduleId: moduleDef.id
        };

        switch (moduleDef.component) {
            case 'correlation':
                return <CorrelationAnalysis {...commonProps} />;
            case 'regression':
                return <RegressionAnalysis {...commonProps} />;
            case 'z-test':
                return <ZTestAnalysis {...commonProps} />;
            case 'confidence':
                return <ConfidenceIntervalAnalysis {...commonProps} />;
            case 'placeholder':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center max-w-3xl mx-auto px-4">
                        <button onClick={() => setActiveModuleId(null)} className="self-start text-cyan-400 hover:text-cyan-300 mb-8 flex items-center">
                            <span className="mr-2">&larr;</span> Back to Curriculum
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
            default:
                return <CurriculumView navigateTo={navigateTo} />;
        }
    };

    // Show loading state while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-slate-300 hidden sm:block max-w-[150px] truncate">
                        {user.email}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        title="Sign Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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


            <GlobalClickLogger page={activeModuleId || 'portal'} />
            {renderPage()}
            <footer className="text-center text-slate-600 mt-24 pb-8 w-full border-t border-slate-800/50 pt-8">
                <p className="font-medium">Data Sandbox 1.04</p>
                <p className="mt-2 text-sm">Designed for Interactive Learning</p>
            </footer>
        </div >
    );
};

export default App;
