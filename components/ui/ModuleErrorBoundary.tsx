import React from 'react';
import { logEvent } from '../../services/loggingService';

interface Props {
    moduleId: string;
    onBack: () => void;
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

// The project has no @types/react, so React.Component resolves untyped;
// declaration-merge the instance members the class actually uses.
interface ModuleErrorBoundary {
    props: Props;
    state: State;
    setState(state: State): void;
}

/**
 * Per-module error boundary: one crashing simulation must never take the
 * whole app down. Crashes are logged to the telemetry stream.
 */
class ModuleErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        logEvent('module_crash', this.props.moduleId, {
            message: String(error?.message || error).slice(0, 300),
            stack: String(info?.componentStack || '').slice(0, 400),
        });
    }

    componentDidUpdate(prevProps: Props) {
        // Reset when navigating to a different module
        if (prevProps.moduleId !== this.props.moduleId && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-xl mx-auto px-4">
                    <div className="text-6xl mb-6" aria-hidden="true">🧪💥</div>
                    <h1 className="text-2xl font-bold text-slate-200 mb-3">This experiment went sideways</h1>
                    <p className="text-slate-400 text-sm mb-8">
                        The module hit an unexpected error. It has been reported automatically.
                        The rest of the sandbox is unaffected.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-xl transition-colors"
                        >
                            Try again
                        </button>
                        <button
                            onClick={this.props.onBack}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-600 transition-colors"
                        >
                            Back to Portal
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ModuleErrorBoundary;
