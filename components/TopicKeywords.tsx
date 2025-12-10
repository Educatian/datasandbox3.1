import React from 'react';
import { Topic, Keyword } from '../types';

interface TopicKeywordsProps {
    topics: Topic[];
    selectedTopicId: number | null;
    onTopicSelect: (topicId: number) => void;
}

const TopicKeywords: React.FC<TopicKeywordsProps> = ({ topics, selectedTopicId, onTopicSelect }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-orange-400 mb-4 text-center">Discovered Topics</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {topics.map(topic => (
                    <div
                        key={topic.id}
                        onClick={() => onTopicSelect(topic.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedTopicId === topic.id ? 'bg-slate-700 ring-2 ring-orange-500' : 'bg-slate-900 hover:bg-slate-700'}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onTopicSelect(topic.id)}
                        aria-pressed={selectedTopicId === topic.id}
                    >
                        <h4 className="font-bold text-slate-200 mb-2 truncate">
                            {topic.name ? topic.name : `Topic ${topic.id + 1}`}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {topic.keywords.map(kw => (
                                <span 
                                    key={kw.text} 
                                    className="bg-slate-800 text-orange-300 text-xs font-medium px-2.5 py-1 rounded-full"
                                    style={{ opacity: 0.6 + kw.weight * 0.4 }}
                                >
                                    {kw.text}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopicKeywords;