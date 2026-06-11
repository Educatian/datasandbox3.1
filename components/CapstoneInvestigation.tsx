import React, { useMemo, useState } from 'react';
import ModuleShell from './ui/ModuleShell';
import ScatterPlot from './ScatterPlot';
import DataContextCard from './ui/DataContextCard';
import { Point } from '../types';
import { calculateCorrelation, calculateLinearRegression, calculateRSquared, tCDF } from '../services/statisticsService';
import { bivariateDatasets, getDataset, scalePointsToViewport, BivariateDataset } from '../data/realDatasets';
import { parseCsv, extractBivariate } from '../utils/csv';
import { logEvent } from '../services/loggingService';

interface CapstoneProps {
    onBack: () => void;
}

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ['Question & Data', 'Explore', 'Conclude', 'Report'];

/**
 * The Capstone: one full pass through the investigative cycle (GAISE 2016)
 * on data the learner chooses — pose a question, explore the relationship,
 * state a claim with an honest scope of inference, and produce a lab report.
 */
const CapstoneInvestigation: React.FC<CapstoneProps> = ({ onBack }) => {
    const [step, setStep] = useState<Step>(0);

    // Step 0: data + question
    const [datasetId, setDatasetId] = useState<string>('gapminder-2007');
    const [ownData, setOwnData] = useState<{ name: string; xLabel: string; yLabel: string; raw: { x: number; y: number }[] } | null>(null);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [question, setQuestion] = useState('');

    // Step 1: exploration
    const [points, setPoints] = useState<Point[]>([]);

    // Step 2: conclusions
    const [direction, setDirection] = useState<'positive' | 'negative' | 'none' | ''>('');
    const [isRandomSample, setIsRandomSample] = useState(false);
    const [isExperiment, setIsExperiment] = useState(false);
    const [conclusion, setConclusion] = useState('');

    const dataset = ownData ? null : (getDataset(datasetId) as BivariateDataset | undefined);
    const xLabel = ownData ? ownData.xLabel : dataset?.xLabel || 'x';
    const yLabel = ownData ? ownData.yLabel : dataset?.yLabel || 'y';
    const sourceName = ownData ? ownData.name : dataset?.name || '';

    const stats = useMemo(() => {
        const r = calculateCorrelation(points);
        const line = calculateLinearRegression(points);
        const r2 = points.length > 1 ? calculateRSquared(points, line) : 0;
        const n = points.length;
        // Two-tailed p for H0: rho = 0 via t = r sqrt((n-2)/(1-r^2))
        let p = 1;
        if (n > 2 && Math.abs(r) < 1) {
            const t = r * Math.sqrt((n - 2) / (1 - r * r));
            p = 2 * (1 - tCDF(Math.abs(t), n - 2));
        }
        return { r, r2, n, p, line };
    }, [points]);

    const loadData = () => {
        const raw = ownData ? ownData.raw : (dataset?.points || []);
        const scaled = scalePointsToViewport(raw);
        setPoints(scaled.map((pt, i) => ({ id: i, x: pt.x, y: pt.y })));
    };

    const handleCsvUpload = (file: File) => {
        setCsvError(null);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const csv = parseCsv(String(reader.result || ''));
                const { points: raw, xLabel, yLabel } = extractBivariate(csv);
                if (raw.length < 5) {
                    setCsvError('Need at least 5 rows with two numeric columns.');
                    return;
                }
                setOwnData({ name: file.name, xLabel, yLabel, raw });
            } catch {
                setCsvError('Could not parse that file as CSV.');
            }
        };
        reader.readAsText(file);
    };

    const claimSupported =
        (direction === 'positive' && stats.r > 0.2) ||
        (direction === 'negative' && stats.r < -0.2) ||
        (direction === 'none' && Math.abs(stats.r) <= 0.2);

    const submitReport = () => {
        logEvent('capstone_submit', 'capstone', {
            dataset: ownData ? `own:${ownData.name}` : datasetId,
            n: stats.n,
            r: Number(stats.r.toFixed(3)),
            p: Number(stats.p.toFixed(5)),
            direction,
            isRandomSample,
            isExperiment,
            questionLength: question.length,
            conclusionLength: conclusion.length,
        });
        setStep(3);
    };

    const stepDone = [
        question.trim().length >= 10,
        points.length >= 5,
        direction !== '' && conclusion.trim().length >= 20,
        true,
    ];

    return (
        <ModuleShell
            title="Your Investigation"
            subtitle="One full pass through the statistical investigative cycle, on data you chose."
            accentClass="text-violet-400"
            backClass="text-violet-400 hover:text-violet-300"
            maxWidthClass="max-w-5xl"
            onBack={onBack}
        >
            {/* Cycle map */}
            <div className="flex items-center gap-1.5 mb-10 no-print" role="tablist" aria-label="Investigation steps">
                {STEP_LABELS.map((label, i) => (
                    <React.Fragment key={label}>
                        {i > 0 && <div className={`flex-1 h-0.5 ${i <= step ? 'bg-violet-500' : 'bg-slate-700'}`} aria-hidden="true"></div>}
                        <button
                            role="tab"
                            aria-selected={step === i}
                            disabled={i > 0 && !stepDone[i - 1]}
                            onClick={() => setStep(i as Step)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${step === i
                                ? 'bg-violet-600 border-violet-400 text-white'
                                : i < step || stepDone[i]
                                    ? 'bg-slate-800 border-slate-600 text-slate-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-600'
                                } disabled:cursor-not-allowed`}
                        >
                            {i + 1}. {label}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {step === 0 && (
                <div className="space-y-6">
                    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-4">1 · Choose your data</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2" htmlFor="capstone-dataset">A real dataset</label>
                                <select
                                    id="capstone-dataset"
                                    value={ownData ? '__own__' : datasetId}
                                    onChange={(e) => { if (e.target.value !== '__own__') { setOwnData(null); setDatasetId(e.target.value); } }}
                                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-violet-500 outline-none"
                                >
                                    {bivariateDatasets().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    {ownData && <option value="__own__">Your upload: {ownData.name}</option>}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">…or your own CSV</label>
                                <input
                                    type="file"
                                    accept=".csv,text/csv,text/plain"
                                    aria-label="Upload your own CSV dataset"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ''; }}
                                    className="block w-full text-xs text-slate-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-200 file:text-xs file:font-bold hover:file:bg-slate-600 file:cursor-pointer"
                                />
                                {csvError && <p className="text-xs text-rose-400 mt-1" role="alert">{csvError}</p>}
                            </div>
                        </div>
                        {dataset && <div className="mt-4"><DataContextCard dataset={dataset} /></div>}
                        {ownData && (
                            <p className="mt-4 text-sm text-cyan-300">
                                Your data: {ownData.name} · {ownData.xLabel} vs {ownData.yLabel} · n = {ownData.raw.length}
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-2">2 · Pose your question</h2>
                        <p className="text-xs text-slate-500 mb-3">A statistical question is about a relationship in a group, not a fact about one case.</p>
                        <textarea
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder={`e.g., "Across countries, is ${xLabel.toLowerCase()} associated with ${yLabel.toLowerCase()}?"`}
                            rows={2}
                            aria-label="Your research question"
                            className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-violet-500 outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={() => { loadData(); setStep(1); }}
                        disabled={!stepDone[0]}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                    >
                        Load the data → explore
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-4 min-h-[420px] flex items-center justify-center">
                            <ScatterPlot
                                data={points}
                                line={stats.line}
                                onPointUpdate={(id: number, x: number, y: number) => setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))}
                                showRegressionLine={true}
                                xAxisLabel={`${xLabel} (rescaled)`}
                                yAxisLabel={`${yLabel} (rescaled)`}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-5">
                                <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-3">Evidence</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">n</span><span className="font-mono text-slate-200">{stats.n}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">r</span><span className="font-mono text-cyan-300">{stats.r.toFixed(3)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">R²</span><span className="font-mono text-slate-200">{stats.r2.toFixed(3)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">p (H₀: ρ = 0)</span><span className="font-mono text-slate-200">{stats.p < 0.001 ? stats.p.toExponential(2) : stats.p.toFixed(4)}</span></div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 px-1">
                                Drag points to test how fragile the pattern is, then reload before concluding: conclusions must be about the data as collected.
                            </p>
                            <button onClick={loadData} className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-bold rounded-xl transition-colors">
                                Reload original data
                            </button>
                            <button onClick={() => setStep(2)} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors">
                                I have seen enough → conclude
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-4">State your claim</h2>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {([['positive', 'Positive association'], ['negative', 'Negative association'], ['none', 'No meaningful association']] as const).map(([v, label]) => (
                                <button
                                    key={v}
                                    onClick={() => setDirection(v)}
                                    aria-pressed={direction === v}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${direction === v ? 'bg-violet-600 border-violet-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {direction && !claimSupported && (
                            <p className="text-xs text-amber-400" role="alert">
                                Careful: your claim does not obviously match r = {stats.r.toFixed(3)}. You may proceed, but be ready to defend it.
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-2">Scope of inference</h2>
                        <p className="text-xs text-slate-500 mb-4">These two checkboxes decide what kind of sentence you are allowed to write.</p>
                        <label className="flex items-start gap-3 text-sm text-slate-300 mb-3 cursor-pointer">
                            <input type="checkbox" checked={isRandomSample} onChange={e => setIsRandomSample(e.target.checked)} className="mt-0.5" />
                            <span>The cases were randomly sampled from a larger population <span className="text-slate-500">(allows generalizing beyond these cases)</span></span>
                        </label>
                        <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={isExperiment} onChange={e => setIsExperiment(e.target.checked)} className="mt-0.5" />
                            <span>The explanatory variable was randomly assigned (an experiment) <span className="text-slate-500">(allows causal language)</span></span>
                        </label>
                        {!isExperiment && (
                            <p className="text-xs text-cyan-300/90 mt-3">
                                No random assignment: your conclusion must say "associated with", never "causes".
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-100 mb-2">Write your conclusion</h2>
                        <textarea
                            value={conclusion}
                            onChange={e => setConclusion(e.target.value)}
                            placeholder="Answer your original question in 2-3 sentences, citing r and n, with the scope your design allows."
                            rows={4}
                            aria-label="Your conclusion"
                            className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-violet-500 outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={submitReport}
                        disabled={!stepDone[2]}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                    >
                        Generate my lab report
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="lab-notebook">
                    <div className="bg-slate-800/90 border border-violet-500/30 rounded-2xl p-8">
                        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-1">Lab report · Data Sandbox capstone</p>
                        <h2 className="text-xl font-bold text-slate-100 mb-6">{question}</h2>

                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-6">
                            <dt className="text-slate-500">Data</dt><dd className="text-slate-200">{sourceName} ({xLabel} vs {yLabel}, n = {stats.n})</dd>
                            <dt className="text-slate-500">Correlation r</dt><dd className="font-mono text-cyan-300">{stats.r.toFixed(3)}</dd>
                            <dt className="text-slate-500">R²</dt><dd className="font-mono text-slate-200">{stats.r2.toFixed(3)}</dd>
                            <dt className="text-slate-500">p (H₀: ρ = 0)</dt><dd className="font-mono text-slate-200">{stats.p < 0.001 ? stats.p.toExponential(2) : stats.p.toFixed(4)}</dd>
                            <dt className="text-slate-500">Claim</dt><dd className="text-slate-200">{direction === 'positive' ? 'Positive association' : direction === 'negative' ? 'Negative association' : 'No meaningful association'}</dd>
                            <dt className="text-slate-500">Scope</dt>
                            <dd className="text-slate-200">
                                {isRandomSample ? 'Generalizable to the sampled population' : 'Describes these cases only'} · {isExperiment ? 'causal claims permitted' : 'association only, no causal claims'}
                            </dd>
                        </dl>

                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Conclusion</h3>
                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{conclusion}</p>
                    </div>

                    <div className="flex gap-3 mt-6 no-print">
                        <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl transition-colors">
                            🖨 Print / Save as PDF
                        </button>
                        <button onClick={() => setStep(0)} className="flex-1 py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors">
                            Start a new investigation
                        </button>
                    </div>
                </div>
            )}
        </ModuleShell>
    );
};

export default CapstoneInvestigation;
