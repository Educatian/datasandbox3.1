import React, { useState, useEffect, useCallback } from 'react';
import { ContingencyTableData, ChiSquareResult } from '../types';
import { calculateChiSquareTest } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import ContingencyTableVisualizer from './ContingencyTableVisualizer';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';
import DataContextCard from './ui/DataContextCard';
import { getDataset, ContingencyDataset } from '../data/realDatasets';
import ModuleShell from './ui/ModuleShell';
import { useTweenedNumber } from '../hooks/useTweenedNumber';

interface ChiSquareAnalysisProps {
    onBack: () => void;
}

const SANDBOX_COUNTS: ContingencyTableData = [
    [30, 10], // Row 1
    [15, 25]  // Row 2
];
const SANDBOX_ROW_LABELS = ['Group 1', 'Group 2'];
const SANDBOX_COL_LABELS = ['Category A', 'Category B'];

const ChiSquareAnalysis: React.FC<ChiSquareAnalysisProps> = ({ onBack }) => {
    const [observedData, setObservedData] = useState<ContingencyTableData>(SANDBOX_COUNTS.map(row => [...row]));
    const [rowLabels, setRowLabels] = useState<string[]>(SANDBOX_ROW_LABELS);
    const [colLabels, setColLabels] = useState<string[]>(SANDBOX_COL_LABELS);
    const [realDataset, setRealDataset] = useState<ContingencyDataset | null>(null);
    const [chiResult, setChiResult] = useState<ChiSquareResult | null>(null);
    const tweenedChi2 = useTweenedNumber(chiResult?.chi2 ?? 0);
    const tweenedP = useTweenedNumber(chiResult?.pValue ?? 1);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can help you understand the relationship between these categorical variables. Try changing the observed frequencies, or load the Titanic data!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleTableChange = (rowIndex: number, colIndex: number, value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) return;
        const newData = observedData.map(row => [...row]);
        newData[rowIndex][colIndex] = numValue;
        setObservedData(newData);
    };

    const loadTitanic = useCallback(() => {
        const ds = getDataset('titanic-class-survival');
        if (!ds || ds.kind !== 'contingency') return;
        setObservedData(ds.counts.map(row => [...row]));
        setRowLabels([...ds.rowLabels]);
        setColLabels([...ds.colLabels]);
        setRealDataset(ds);
        setChatHistory(prev => [...prev, {
            text: `Loaded real data: ${ds.name}. Every count is a real person aboard the Titanic, sorted by ticket class (plus crew) and outcome. Was survival independent of class? Look at the chi-square result, then ask me what it means.`,
            role: 'model'
        }]);
    }, []);

    const resetSandbox = useCallback(() => {
        setObservedData(SANDBOX_COUNTS.map(row => [...row]));
        setRowLabels(SANDBOX_ROW_LABELS);
        setColLabels(SANDBOX_COL_LABELS);
        setRealDataset(null);
    }, []);

    useEffect(() => {
        const result = calculateChiSquareTest(observedData);
        setChiResult(result);
    }, [observedData]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const tableSummary = rowLabels
            .map((rl, i) => `${rl}: ${colLabels.map((cl, j) => `${cl}=${observedData[i]?.[j] ?? 0}`).join(', ')}`)
            .join('\n            ');

        const context = `
            We are performing a Chi-Square Test of Independence on a ${rowLabels.length}x${colLabels.length} contingency table.
            ${realDataset ? `REAL dataset: ${realDataset.name} (${realDataset.source}). Context: ${realDataset.contextNote} Rows are ticket classes plus crew; columns are Died vs Survived. Ground every explanation in this real story.` : ''}
            Observed Data:
            ${tableSummary}

            Test Results:
            Chi-Square Statistic: ${chiResult?.chi2.toFixed(3)}
            Degrees of Freedom: ${chiResult?.degreesOfFreedom}
            P-Value: ${chiResult?.pValue.toFixed(5)}

            User Question: ${msg}

            Explain whether there is a significant association between the groups and the categories based on the p-value.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the contingency table right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [observedData, chiResult, rowLabels, colLabels, realDataset]);

    return (
        <ModuleShell
            title="Chi-Square Test of Independence"
            subtitle="Explore the relationship between two categorical variables."
            accentClass="text-amber-400"
            backClass="text-amber-400 hover:text-amber-300"
            onBack={onBack}
        >
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-6 flex flex-col space-y-6">
                    <h3 className="text-lg font-semibold text-amber-400 text-center">Contingency Table</h3>
                    <div className="flex-grow">
                        {chiResult && <ContingencyTableVisualizer observed={observedData} expected={chiResult.expected} />}
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                        Rows top to bottom: {rowLabels.join(', ')}. Columns left to right: {colLabels.join(', ')}.
                    </p>
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Observed Frequencies</h3>
                        <table className="w-full text-center">
                            <thead>
                                <tr>
                                    <th></th>
                                    {colLabels.map(cl => (
                                        <th key={cl} className="font-normal text-slate-400">{cl}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {observedData.map((row, i) => (
                                    <tr key={i}>
                                        <td className="font-normal text-slate-400 text-left">{rowLabels[i]}</td>
                                        {row.map((cell, j) => (
                                            <td key={j}>
                                                <input type="number" value={cell} onChange={e => handleTableChange(i, j, e.target.value)} className="w-20 bg-slate-900 text-center p-2 rounded" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={loadTitanic}
                                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                                <span aria-hidden="true">🌍</span> Load Titanic Data
                            </button>
                            {realDataset && (
                                <>
                                    <button
                                        onClick={resetSandbox}
                                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                    >
                                        Reset to Sandbox
                                    </button>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Full 4 by 2 table: ticket classes and crew vs outcome. Counts stay editable, so you can test how the association would change.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {realDataset && <DataContextCard dataset={realDataset} />}

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Test Results</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Chi-Square (χ²):</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">{chiResult ? tweenedChi2.toFixed(3) : null}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">p-value:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">{chiResult ? tweenedP.toFixed(4) : null}</span>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Chi-Square Analysis"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
        </ModuleShell>
    );
};

export default ChiSquareAnalysis;
