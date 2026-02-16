import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechState =
  | "idle"
  | "listening"
  | "processing"
  | "done"
  | "error"
  | "unsupported";

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  transcript: string;
  errorMessage: string;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const errorMessages: Record<string, string> = {
  "not-allowed": "Microphone access denied. Please allow microphone access.",
  "no-speech": "No speech detected. Please try again.",
  "audio-capture": "No microphone found. Please check your device.",
  network: "Network error. Speech recognition requires an internet connection.",
  aborted: "Speech recognition was aborted."
};

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const SpeechRecognitionClass = getSpeechRecognition();
  const isSupported = SpeechRecognitionClass !== null;

  const [state, setState] = useState<SpeechState>(
    isSupported ? "idle" : "unsupported"
  );
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setTranscript("");
    setErrorMessage("");
    setState("listening");

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(result);
      setState("done");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const message =
        errorMessages[event.error] ??
        `Speech recognition error: ${event.error}`;
      setErrorMessage(message);
      setState("error");
    };

    recognition.onend = () => {
      setState((prev) => {
        if (prev === "listening" || prev === "processing") {
          setErrorMessage("No speech detected. Please try again.");
          return "error";
        }
        return prev;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionClass]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      setState("processing");
      recognitionRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setTranscript("");
    setErrorMessage("");
    setState(isSupported ? "idle" : "unsupported");
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { state, transcript, errorMessage, isSupported, start, stop, reset };
}
