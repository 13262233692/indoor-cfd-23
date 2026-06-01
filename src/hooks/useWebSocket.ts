import { useEffect, useRef, useCallback } from 'react';
import type { ProgressMessage } from '../../shared/types.js';
import { getWebSocketUrl } from '../utils/api.js';

interface UseWebSocketOptions {
  onProgress?: (taskId: string, progress: number) => void;
  onResult?: (taskId: string, result: any) => void;
  onError?: (taskId: string, error: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: ProgressMessage = JSON.parse(event.data);
          
          if (message.type === 'progress' && message.progress !== undefined) {
            options.onProgress?.(message.taskId, message.progress);
          } else if (message.type === 'result' && message.result) {
            options.onResult?.(message.taskId, message.result);
          } else if (message.type === 'error' && message.error) {
            options.onError?.(message.taskId, message.error);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        options.onClose?.();
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
      reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
    }
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
