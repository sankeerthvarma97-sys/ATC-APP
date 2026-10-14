import { useState, useCallback, useRef, useEffect } from "react";

export interface UseCopyToClipboardOptions {
  timeout?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useCopyToClipboard({
  timeout = 2000,
  onSuccess,
  onError,
}: UseCopyToClipboardOptions = {}) {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (!text) return false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== "undefined") {
          // Fallback for older browsers or non-secure contexts
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "-9999px";
          textarea.setAttribute("readonly", "");
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        } else {
          throw new Error("Clipboard API unavailable");
        }

        setIsCopied(true);
        setError(null);
        onSuccess?.();

        timerRef.current = setTimeout(() => {
          setIsCopied(false);
        }, timeout);

        return true;
      } catch (err) {
        const copyError = err instanceof Error ? err : new Error("Failed to copy to clipboard");
        setError(copyError);
        setIsCopied(false);
        onError?.(copyError);
        return false;
      }
    },
    [timeout, onSuccess, onError],
  );

  return { isCopied, copy, error };
}
