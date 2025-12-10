import React, { useMemo } from 'react';
import { LdaDocument, Topic } from '../types';

interface DocumentViewerProps {
    documents: LdaDocument[];
    topics: Topic[];
    selectedTopicId: number | null;
}

const highlightKeywords = (content: string, keywords: string[]): React.ReactNode => {
    if (keywords.length === 0) return content;
    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    const parts = content.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <span key={i} className="bg-orange-500/30 font-semibold rounded px-1">
                {part}
            </span>
        ) : (
            part
        )
    );
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documents, topics, selectedTopicId }) => {

    const relevantDocs = useMemo(() => {
        if (selectedTopicId === null) return [];
        return documents
            .map(doc => ({
                ...doc,
                relevance: doc.topicDistribution.find(d => d.topicId === selectedTopicId)?.weight || 0,
            }))
            .filter(doc => doc.relevance > 0.1)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5); // Show top 5
    }, [documents, selectedTopicId]);

    const selectedTopicKeywords = useMemo(() => {
        if (selectedTopicId === null) return [];
        const topic = topics.find(t => t.id === selectedTopicId);
        return topic ? topic.keywords.map(kw => kw.text) : [];
    }, [topics, selectedTopicId]);
    
    const selectedTopicName = useMemo(() => {
        if (selectedTopicId === null) return "No Topic Selected";
        const topic = topics.find(t => t.id === selectedTopicId);
        return topic?.name || `Topic ${selectedTopicId + 1}`;
    }, [topics, selectedTopicId]);

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg h-[60vh] flex flex-col">
            <h3 className="text-lg font-semibold text-orange-400 mb-4 text-center">
                Top Documents for: <span className="text-white">{selectedTopicName}</span>
            </h3>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {relevantDocs.length > 0 ? (
                    relevantDocs.map(doc => (
                        <div key={doc.id} className="bg-slate-900 p-4 rounded-lg">
                            <div className="text-xs text-orange-400 font-mono mb-2">
                                Topic Weight: {(doc.relevance * 100).toFixed(1)}%
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                {highlightKeywords(doc.content, selectedTopicKeywords)}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500">Select a topic to see relevant documents.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;