import { useState, useRef, useCallback, useEffect } from 'react';
import { callAiStreamApi, isAiAccessError } from '@/lib/aiClient';

export interface UseAiStreamOptions {
  onChunk?: (chunk: string, accumulated: string) => void;
  onDone?: (fullText: string, meta?: any) => void;
  onError?: (error: Error) => void;
}

export function useAiStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamMeta, setStreamMeta] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStream = useCallback(
    async (
      endpoint: string,
      body: Record<string, unknown> = {},
      options?: UseAiStreamOptions,
    ) => {
      // Abort any existing stream
      abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);
      setStreamedText('');
      setStreamMeta(null);
      setError(null);

      let accumulated = '';
      let receivedMeta: any = null;

      try {
        const result = await callAiStreamApi(endpoint, body, {
          signal: controller.signal,
          onChunk: (chunk) => {
            accumulated += chunk;
            setStreamedText(accumulated);
            options?.onChunk?.(chunk, accumulated);
          },
          onMeta: (meta) => {
            receivedMeta = meta;
            setStreamMeta(meta);
          },
        });

        setIsStreaming(false);
        options?.onDone?.(result.fullText, result.meta);
        return result;
      } catch (err: any) {
        if (controller.signal.aborted) {
          // Intentional abort, do not set error
          return null;
        }

        const standardError = err instanceof Error ? err : new Error(String(err));
        setError(standardError);
        setIsStreaming(false);

        if (!isAiAccessError(err)) {
          options?.onError?.(standardError);
        }
        throw err;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [abort],
  );

  return {
    isStreaming,
    streamedText,
    streamMeta,
    error,
    startStream,
    abort,
    setStreamedText,
  };
}
