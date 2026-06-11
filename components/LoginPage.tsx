import React, { useState } from 'react';
import { signIn } from '../services/supabaseService';
import { logLogin, setUser } from '../services/loggingService';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const FEATURES = [
    {
        icon: '🎛️',
        title: '50+ hands-on simulations',
        text: 'Galton boards, dart boards, p-hacking fishers: grab the concepts and break them.'
    },
    {
        icon: '🌍',
        title: '13 real datasets',
        text: "Galton's 1886 heights, Challenger O-rings, Gapminder: every point is a real measurement."
    },
    {
        icon: '🤖',
        title: 'Dr. Gem, Socratic AI tutor',
        text: 'Asks you the next question instead of spoiling the answer the simulation can show you.'
    },
    {
        icon: '🎯',
        title: 'Predict, test, explain',
        text: 'Commit to a prediction, run the experiment, confront your intuition. Missions included.'
    },
];

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { user, error } = await signIn(email, password);

        if (error) {
            setError(error.message);
        } else if (user) {
            // Log the successful login
            setUser(user.email || user.id);
            logLogin(user.email || user.id, 'login_form');
            onLoginSuccess();
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950 font-sans">
            {/* Ambient video hero background (falls back to the still hero) */}
            <video
                className="absolute inset-0 w-full h-full object-cover opacity-50 motion-reduce:hidden"
                src="/brand/hero_loop.mp4"
                poster="/brand/hero.webp"
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
            />
            <img
                src="/brand/hero.webp"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-50 hidden motion-reduce:block"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/95"></div>

            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Top bar */}
                <div className="flex items-center gap-3 px-6 lg:px-12 pt-6">
                    <img src="/brand/logo.webp" alt="Data Sandbox logo" className="w-10 h-10 rounded-xl shadow-lg shadow-cyan-500/30" />
                    <div>
                        <span className="block font-game text-sm text-slate-200 tracking-tight leading-none">Data Sandbox</span>
                        <span className="block text-[10px] text-slate-500 tracking-widest uppercase mt-1">Interactive Statistics Playground</span>
                    </div>
                </div>

                {/* Main split */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto w-full px-6 lg:px-12 py-12">
                    {/* Left: pitch */}
                    <div>
                        <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-cyan-300 font-game tracking-tight drop-shadow-lg">
                            Statistics you can grab
                        </h1>
                        <p className="mt-5 text-lg text-slate-300 max-w-xl leading-relaxed">
                            Don't just read about p-values: flip the coins, drop the balls, drag the outliers,
                            and watch the concepts emerge from your own hands.
                        </p>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                            {FEATURES.map(f => (
                                <div key={f.title} className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-4 hover:border-cyan-500/40 transition-colors">
                                    <p className="text-sm font-bold text-slate-200">
                                        <span className="mr-2" aria-hidden="true">{f.icon}</span>{f.title}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{f.text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-2">
                            {['10-assessment core curriculum', '25-module advanced track', 'Exact statistics engine', 'Built for learning research'].map(chip => (
                                <span key={chip} className="text-[11px] px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700/50 text-slate-400">
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right: login card */}
                    <div className="w-full max-w-md mx-auto lg:ml-auto">
                        <div className="relative rounded-3xl p-8 border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl">
                            <div className="absolute -top-4 left-8 px-4 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-400 uppercase tracking-wider shadow-lg">
                                Welcome back
                            </div>

                            {error && (
                                <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium" role="alert">
                                    <span className="font-bold">⚠️ Error:</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2" htmlFor="login-email">
                                        Email Address
                                    </label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-sm font-medium mb-2" htmlFor="login-password">
                                        Password
                                    </label>
                                    <input
                                        id="login-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 mt-2 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-violet-600 shadow-cyan-500/30"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        'Enter the Sandbox'
                                    )}
                                </button>
                            </form>

                            <div className="text-center text-slate-500 text-xs mt-6">
                                <p className="mb-2">Need an account?</p>
                                <p className="text-slate-400">
                                    Please contact your instructor or administrator directly.
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 text-center text-[11px] text-slate-500 italic">
                            Every interaction you make becomes part of how we understand learning. Anonymized, always.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center text-slate-600 py-6">
                    <p className="font-medium">Data Sandbox 2.0</p>
                    <p className="mt-1 text-sm">Designed for Interactive Learning</p>
                </footer>
            </div>
        </div>
    );
};

export default LoginPage;
