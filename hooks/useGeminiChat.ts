import { useState, useCallback, useRef } from 'react';
import { getChatResponse } from '../services/geminiService';
import { Message } from '../components/UnifiedGenAIChat';

/**
 * Shared Dr. Gem chat state for a module.
 *
 * @param welcomeMessage  First bot message shown when the module opens.
 * @param getContext      Returns the module context string sent with every
 *                        user question. Read at send time, so it can close
 *                        over live state (slider values, current results).
 */
export const useGeminiChat = (welcomeMessage: string, getContext: () => string) => {
    const [chatHistory, setChatHistory] = useState<Message[]>(
        welcomeMessage ? [{ text: welcomeMessage, role: 'model' }] : []
    );
    const [isChatLoading, setIsChatLoading] = useState(false);

    const getContextRef = useRef(getContext);
    getContextRef.current = getContext;

    const sendMessage = useCallback(async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);
        setIsChatLoading(true);
        try {
            const response = await getChatResponse(msg, getContextRef.current());
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, []);

    const addBotMessage = useCallback((text: string) => {
        setChatHistory(prev => [...prev, { text, role: 'model' }]);
    }, []);

    return { chatHistory, isChatLoading, sendMessage, addBotMessage };
};
