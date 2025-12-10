import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle, signInWithGitHub } from '../services/supabaseService';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        if (isSignUp) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                setLoading(false);
                return;
            }
            const { error } = await signUp(email, password);
            if (error) {
                setError(error.message);
            } else {
                setMessage('Check your email for the confirmation link!');
            }
        } else {
            const { user, error } = await signIn(email, password);
            if (error) {
                setError(error.message);
            } else if (user) {
                onLoginSuccess();
            }
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    const handleGitHubLogin = async () => {
        setError(null);
        setLoading(true);
        const { error } = await signInWithGitHub();
        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden">
            {/* Background decorations matching Data Sandbox theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <header className="text-center mb-10">
                    <div className="text-6xl mb-4">📊</div>
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 font-game tracking-tight filter drop-shadow-lg">
                        Data Sandbox
                    </h1>
                    <p className="text-slate-400 mt-3 text-lg font-light tracking-wide">
                        Interactive Statistics Curriculum
                    </p>
                </header>

                {/* Login Card */}
                <div className="relative rounded-3xl p-8 border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm">
                    {/* Tab Badge */}
                    <div className="absolute -top-4 left-8 px-4 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </div>

                    {/* Toggle Tabs */}
                    <div className="flex gap-2 mb-6 mt-2">
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${!isSignUp
                                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${isSignUp
                                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                            <span className="font-bold">⚠️ Error:</span> {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                            <span className="font-bold">✓ Success:</span> {message}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
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
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                            />
                        </div>
                        {isSignUp && (
                            <div>
                                <label className="block text-slate-400 text-sm font-medium mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 mt-2 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${isSignUp
                                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-violet-500/30 hover:shadow-violet-500/50'
                                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-cyan-500/30 hover:shadow-cyan-500/50'
                                }`}
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
                                isSignUp ? '🚀 Create Account' : '🔓 Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-slate-700"></div>
                        <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">or continue with</span>
                        <div className="flex-1 h-px bg-slate-700"></div>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 group disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm">Google</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleGitHubLogin}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 font-medium hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 group disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span className="text-sm">GitHub</span>
                        </button>
                    </div>

                    {/* Footer text */}
                    <p className="text-center text-slate-500 text-xs mt-6">
                        By continuing, you agree to our{' '}
                        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Terms</a>
                        {' '}and{' '}
                        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</a>
                    </p>
                </div>

                {/* Activity hint matching Data Sandbox style */}
                <div className="mt-6 text-center">
                    <div className="inline-block text-xs text-slate-500 italic bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/30">
                        <span className="font-bold not-italic text-slate-600 mr-1">🎮 Ready to explore:</span>
                        Interactive statistics concepts through hands-on manipulation
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 right-0 text-center text-slate-600 py-6 border-t border-slate-800/50">
                <p className="font-medium">Data Sandbox 1.04</p>
                <p className="mt-1 text-sm">Designed for Interactive Learning</p>
            </footer>
        </div>
    );
};

export default LoginPage;
