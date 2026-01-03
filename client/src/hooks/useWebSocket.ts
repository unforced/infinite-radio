import { useEffect, useRef, useState, useCallback } from 'react';
import type { ServerMessage, RadioState, Segment, ChatMessage, PatternFeedback } from '../../../shared/types';

interface UseWebSocketReturn {
  connected: boolean;
  radioState: RadioState | null;
  currentPattern: Segment | null;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  aiReasoning: string | null;
  listenerCount: number;
  patternFeedback: PatternFeedback | null;
  userVote: 1 | -1 | null;
  error: string | null;
  sendChat: (message: string) => void;
  sendVote: (patternId: string, value: 1 | -1) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [radioState, setRadioState] = useState<RadioState | null>(null);
  const [currentPattern, setCurrentPattern] = useState<Segment | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const [patternFeedback, setPatternFeedback] = useState<PatternFeedback | null>(null);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);

      // Auto-join with a random username
      if (!hasJoinedRef.current) {
        const username = `Listener${Math.floor(Math.random() * 10000)}`;
        ws.send(JSON.stringify({ type: 'join', username }));
        hasJoinedRef.current = true;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      hasJoinedRef.current = false;
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'welcome':
            setRadioState(message.radioState);
            setCurrentPattern(message.radioState.currentPattern);
            setChatMessages(message.recentChat);
            setIsGenerating(message.radioState.isGenerating);
            setListenerCount(message.radioState.listeners);
            break;

          case 'pattern':
            setCurrentPattern(message.pattern);
            // Reset feedback state for new pattern
            setPatternFeedback(null);
            setUserVote(null);
            break;

          case 'vote_update':
            setPatternFeedback(message.feedback);
            break;

          case 'chat':
            setChatMessages((prev) => [...prev.slice(-49), message.message]);
            break;

          case 'ai_status':
            setIsGenerating(message.isGenerating);
            setAiReasoning(message.reasoning);
            break;

          case 'listeners':
            setListenerCount(message.count);
            break;

          case 'error':
            setError(message.error);
            break;
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendChat = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', message }));
    } else {
      setError('Not connected to server');
    }
  }, []);

  const sendVote = useCallback((patternId: string, value: 1 | -1) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'vote', patternId, value }));
      setUserVote(value);
    } else {
      setError('Not connected to server');
    }
  }, []);

  return {
    connected,
    radioState,
    currentPattern,
    chatMessages,
    isGenerating,
    aiReasoning,
    listenerCount,
    patternFeedback,
    userVote,
    error,
    sendChat,
    sendVote,
  };
}
