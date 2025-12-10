import React, { useState, useEffect, useCallback } from 'react';
import { ContingencyTableData, ChiSquareResult } from '../types';
import { calculateChiSquareTest } from '../services/statisticsService';
import { getChiSquareExplanation, getIndependenceExplanation } from '../services/geminiService';
import ContingencyTableVisualizer from './ContingencyTableVisualizer';
import GeminiExplanation from './GeminiExplanation';

interface ChiSquareAnalysisProps {
    onBack: () => void;
}

const ChiSquareAnalysis: React.FC<ChiSquareAnalysisProps> = ({ onBack }) => {
    const [observedData, setObservedData] = useState<ContingencyTableData>([
        [30, 10], // Row 1
        [15, 25]  // Row 2
    ]);
    const [chiResult, setChiResult] = useState<ChiSquareResult | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [infoTopic, setInfoTopic] = useState<'result' | 'independence' | null>(null);

    const handleTableChange = (rowIndex: number, colIndex: number, value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) return;
        const newData = observedData.map(row => [...row]);
        newData[rowIndex][colIndex] = numValue;
        setObservedData(newData);
    };

    useEffect(() => {
        const result = calculateChiSquareTest(observedData);
        setChiResult(result);
        setInfoTopic('result'); // Default to showing result explanation when data changes
    }, [observedData]);

    const fetchExplanation = useCallback(async () => {
        if (!chiResult) return;
        setIsLoading(true);
        let exp = '';
        if (infoTopic === 'result') {
            exp = await getChiSquareExplanation(chiResult.pValue);
        } else if (infoTopic === 'independence') {
            exp = await getIndependenceExplanation();
        }
        setExplanation(exp);
        setIsLoading(false);
    }, [chiResult, infoTopic]);

    useEffect(() => {
        if (!chiResult || infoTopic === null) return;
        const handler = setTimeout(fetchExplanation, 1500);
        return () => clearTimeout(handler);
    }, [chiResult, infoTopic, fetchExplanation]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">Chi-Square Test of Independence</h1>
                    <p className="text-slate-400 mt-2">Explore the relationship between two categorical variables.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-6 flex flex-col space-y-6">
                    <h3 className="text-lg font-semibold text-amber-400 text-center">Contingency Table</h3>
                    <div className="flex-grow">
                        {chiResult && <ContingencyTableVisualizer observed={observedData} expected={chiResult.expected} />}
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Observed Frequencies</h3>
                        <table className="w-full text-center">
                            <thead>
                                <tr><th></th><th className="font-normal text-slate-400">Category A</th><th className="font-normal text-slate-400">Category B</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-normal text-slate-400 text-left">Group 1</td>
                                    <td><input type="number" value={observedData[0][0]} onChange={e => handleTableChange(0, 0, e.target.value)} className="w-20 bg-slate-900 text-center p-2 rounded" /></td>
                                    <td><input type="number" value={observedData[0][1]} onChange={e => handleTableChange(0, 1, e.target.value)} className="w-20 bg-slate-900 text-center p-2 rounded" /></td>
                                </tr>
                                 <tr>
                                    <td className="font-normal text-slate-400 text-left">Group 2</td>
                                    <td><input type="number" value={observedData[1][0]} onChange={e => handleTableChange(1, 0, e.target.value)} className="w-20 bg-slate-900 text-center p-2 rounded" /></td>
                                    <td><input type="number" value={observedData[1][1]} onChange={e => handleTableChange(1, 1, e.target.value)} className="w-20 bg-slate-900 text-center p-2 rounded" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                         <h3 className="text-lg font-semibold text-amber-400 mb-3">Test Results</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Chi-Square (χ²):</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">{chiResult?.chi2.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">p-value:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">{chiResult?.pValue.toFixed(4)}</span>
                        </div>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-4 rounded-lg shadow-lg text-center text-sm">
                        <p className="text-slate-400">What does independence mean?</p>
                        <button onClick={() => setInfoTopic('independence')} className="text-amber-400 hover:underline">Ask Gemini</button>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    You want to know if there's a relationship between a student's chosen major (e.g., STEM vs. Humanities) and their preferred learning resource (e.g., Video Lectures vs. Interactive Textbooks). A low p-value suggests the preference isn't random; for example, STEM students might significantly prefer interactive resources. This insight can guide content development for different learner populations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChiSquareAnalysis;