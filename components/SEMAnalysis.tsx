import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SEMModel, FitIndices, SEMPath } from '../types';
import { calculateModelFit } from '../services/statisticsService';
import { getSEMExplanation } from '../services/geminiService';
import PathDiagram from './PathDiagram';
import GeminiExplanation from './GeminiExplanation';

interface SEMAnalysisProps {
    onBack: () => void;
}

const initialModel: SEMModel = {
    variables: [
        { id: 'mot', type: 'latent', label: 'Motivation', x: 100, y: 150 },
        { id: 'sh', type: 'latent', label: 'Study Habits', x: 100, y: 350 },
        { id: 'm1', type: 'observed', label: 'm1', x: 250, y: 100 },
        { id: 'm2', type: 'observed', label: 'm2', x: 250, y: 150 },
        { id: 'm3', type: 'observed', label: 'm3', x: 250, y: 200 },
        { id: 'sh1', type: 'observed', label: 'sh1', x: 250, y: 300 },
        { id: 'sh2', type: 'observed', label: 'sh2', x: 250, y: 350 },
        { id: 'sh3', type: 'observed', label: 'sh3', x: 250, y: 400 },
        { id: 'gra', type: 'observed', label: 'Grades', x: 400, y: 250 },
    ],
    paths: [
        // Loadings (fixed)
        { id: 'mot-m1', from: 'mot', to: 'm1', type: 'loading', specified: true, isStructural: false },
        { id: 'mot-m2', from: 'mot', to: 'm2', type: 'loading', specified: true, isStructural: false },
        { id: 'mot-m3', from: 'mot', to: 'm3', type: 'loading', specified: true, isStructural: false },
        { id: 'sh-sh1', from: 'sh', to: 'sh1', type: 'loading', specified: true, isStructural: false },
        { id: 'sh-sh2', from: 'sh', to: 'sh2', type: 'loading', specified: true, isStructural: false },
        { id: 'sh-sh3', from: 'sh', to: 'sh3', type: 'loading', specified: true, isStructural: false },
        // Structural paths (toggleable)
        { id: 'mot-sh', from: 'mot', to: 'sh', type: 'regression', specified: false, isStructural: true },
        { id: 'sh-gra', from: 'sh', to: 'gra', type: 'regression', specified: false, isStructural: true },
        { id: 'mot-gra', from: 'mot', to: 'gra', type: 'regression', specified: false, isStructural: true },
        { id: 'mot-sh-cov', from: 'mot', to: 'sh', type: 'covariance', specified: false, isStructural: true },
    ]
};

const FitDisplay: React.FC<{ label: string; value: string | number; isGood?: boolean; isBad?: boolean }> = ({ label, value, isGood, isBad }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-300">{label}:</span>
        <span className={`font-mono bg-slate-900 px-2 py-1 rounded ${isGood ? 'text-green-400' : ''} ${isBad ? 'text-red-400' : ''}`}>
            {value}
        </span>
    </div>
);

const SEMAnalysis: React.FC<SEMAnalysisProps> = ({ onBack }) => {
    const [userModel, setUserModel] = useState<SEMModel>(initialModel);
    const [fitIndices, setFitIndices] = useState<FitIndices | null>(null);
    const [prevFit, setPrevFit] = useState<FitIndices | null>(null);
    const [lastChangedPath, setLastChangedPath] = useState<SEMPath | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const variableLabels = useMemo(() => Object.fromEntries(userModel.variables.map(v => [v.id, v.label])), [userModel.variables]);

    const handlePathToggle = useCallback((pathId: string) => {
        setUserModel(currentModel => {
            const newModel = { ...currentModel, paths: currentModel.paths.map(p => ({ ...p })) };
            const path = newModel.paths.find(p => p.id === pathId);
            if (path && path.isStructural) {
                // Special handling for covariance vs regression between the same two nodes
                if (path.type === 'covariance') {
                    const regressionPath = newModel.paths.find(p => p.from === path.from && p.to === path.to && p.type === 'regression');
                    if (regressionPath) regressionPath.specified = false;
                }
                if (path.type === 'regression') {
                     const covariancePath = newModel.paths.find(p => p.from === path.from && p.to === path.to && p.type === 'covariance');
                    if (covariancePath) covariancePath.specified = false;
                }

                path.specified = !path.specified;
                setLastChangedPath(path);
            }
            return newModel;
        });
    }, []);
    
    useEffect(() => {
        setPrevFit(fitIndices);
        const newFit = calculateModelFit(userModel);
        setFitIndices(newFit);
    }, [userModel]);

    useEffect(() => {
        if (!fitIndices || !lastChangedPath) {
            setExplanation("Click a dashed line to add a path to your model and see how it affects the model's fit.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getSEMExplanation(fitIndices, prevFit, lastChangedPath, variableLabels);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [fitIndices, lastChangedPath]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-orange-400 hover:text-orange-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-orange-400">Structural Equation Modeling</h1>
                    <p className="text-slate-400 mt-2">Test your theory. Click paths to build a model and check its fit to the data.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <PathDiagram model={userModel} onPathToggle={handlePathToggle} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">Model Fit Indices</h3>
                        <div className="space-y-2">
                           <FitDisplay label="Chi-Square (χ²)" value={fitIndices?.chiSquare.toFixed(2) || 'N/A'} />
                           <FitDisplay label="p-value" value={fitIndices?.pValue.toFixed(3) || 'N/A'} isGood={fitIndices && fitIndices.pValue > 0.05} isBad={fitIndices && fitIndices.pValue <= 0.05} />
                           <FitDisplay label="CFI" value={fitIndices?.cfi.toFixed(3) || 'N/A'} isGood={fitIndices && fitIndices.cfi >= 0.95} isBad={fitIndices && fitIndices.cfi < 0.90} />
                           <FitDisplay label="RMSEA" value={fitIndices?.rmsea.toFixed(3) || 'N/A'} isGood={fitIndices && fitIndices.rmsea <= 0.06} isBad={fitIndices && fitIndices.rmsea > 0.10}/>
                        </div>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   SEM is used to test complex theories. For instance, a researcher might theorize that a student's 'Motivation' influences their 'Study Habits,' and that both, in turn, affect their final 'Grades'. SEM allows the researcher to model and test this entire system of relationships at once, providing a holistic view of the factors contributing to academic success.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SEMAnalysis;