import React, { useState } from 'react';
import { signIn } from '../services/supabaseService';
import { logLogin, setUser } from '../services/loggingService';
import MinimalBackground from './MinimalBackground';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden bg-slate-900">
            <MinimalBackground />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <header className="text-center mb-10">
                    <div className="text-6xl mb-4 drop-shadow-lg">📊</div>
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 font-game tracking-tight filter drop-shadow-lg">
                        Data Sandbox
                    </h1>
                    <p className="text-slate-400 mt-3 text-lg font-light tracking-wide">
                        Interactive Statistics Curriculum
                    </p>
                </header>

                {/* Login Card */}
                <div className="relative rounded-3xl p-8 border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
                    {/* Tab Badge */}
                    <div className="absolute -top-4 left-8 px-4 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-400 uppercase tracking-wider shadow-lg">
                        Welcome Back
                    </div>

                    {/* Error Messages */}
                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium">
                            <span className="font-bold">⚠️ Error:</span> {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 mt-2 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-cyan-700 shadow-cyan-500/30`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                '🔓 Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer text */}
                    <div className="text-center text-slate-500 text-xs mt-6">
                        <p className="mb-2">Need an account?</p>
                        <p className="text-slate-400">
                            Please contact your instructor or administrator directly.
                        </p>
                    </div>
                </div>

                {/* Activity hint */}
                <div className="mt-6 text-center">
                    <div className="inline-block text-xs text-slate-500 italic bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700/50 shadow-sm backdrop-blur-sm">
                        <span className="font-bold not-italic text-slate-400 mr-1">🎮 Ready to explore:</span>
                        Interactive statistics concepts through hands-on manipulation
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 right-0 text-center text-slate-500 py-6">
                <p className="font-medium text-slate-500">Data Sandbox 1.05</p>
                <p className="mt-1 text-sm bg-clip-text text-transparent bg-gradient-to-r from-slate-600 to-slate-500">Designed for Interactive Learning</p>
            </footer>
        </div>
    );
};

export default LoginPage;
