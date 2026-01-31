import { useCallback, useEffect, useRef, useState } from "react";
import type { PronunciationResult } from "@/lib/types";

export type SpeechState =
  | "idle"
  | "loading"
  | "listening"
  | "processing"
  | "done"
  | "error";

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  result: PronunciationResult | null;
  errorMessage: string;
  start: (expectedText: string) => void;
  stop: () => void;
  reset: () => void;
}

const MODEL_URL = "/models/stt-nemo-ctc-small-int4.onnx";
const SAMPLE_RATE = 16000;

function checkDeviceCompatibility(): string | null {
  if (typeof WebAssembly === "undefined") {
    return "Your browser does not support WebAssembly. Please use a modern browser.";
  }
  if (typeof Worker === "undefined") {
    return "Your browser does not support Web Workers. Please use a modern browser.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Your browser does not support microphone access. Please use a modern browser with HTTPS.";
  }
  return null;
}

export default function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [state, setState] = useState<SpeechState>("idle");
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const modelReadyRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const expectedTextRef = useRef("");

  const initWorker = useCallback(() => {
    if (workerRef.current) return;

    const worker = new Worker(
      new URL("../workers/stt-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case "ready":
          modelReadyRef.current = true;
          setState((prev) => (prev === "loading" ? "idle" : prev));
          break;
        case "result":
          setResult(msg.result);
          setState("done");
          break;
        case "error":
          setErrorMessage(msg.error);
          setState("error");
          break;
      }
    };

    worker.postMessage({ type: "init", modelUrl: MODEL_URL });
    workerRef.current = worker;
  }, []);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (contextRef.current) {
      void contextRef.current.close();
      contextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(
    (expectedText: string) => {
      const compatError = checkDeviceCompatibility();
      if (compatError) {
        setErrorMessage(compatError);
        setState("error");
        return;
      }

      initWorker();
      expectedTextRef.current = expectedText;
      chunksRef.current = [];
      setResult(null);
      setErrorMessage("");

      if (!modelReadyRef.current) {
        setState("loading");
        const checkReady = setInterval(() => {
          if (modelReadyRef.current) {
            clearInterval(checkReady);
            startRecording();
          }
        }, 100);
        return;
      }

      startRecording();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function startRecording() {
    setState("listening");

    navigator.mediaDevices
      .getUserMedia({ audio: { sampleRate: SAMPLE_RATE, channelCount: 1 } })
      .then((stream) => {
        streamRef.current = stream;
        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        contextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          const data = e.inputBuffer.getChannelData(0);
          chunksRef.current.push(new Float32Array(data));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      })
      .catch((err) => {
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            setErrorMessage(
              "Microphone access denied. Please allow microphone access."
            );
          } else if (err.name === "NotFoundError") {
            setErrorMessage("No microphone found. Please check your device.");
          } else {
            setErrorMessage(`Audio error: ${err.message}`);
          }
        } else {
          setErrorMessage("Failed to access microphone.");
        }
        setState("error");
      });
  }

  const stop = useCallback(() => {
    stopRecording();
    setState("processing");

    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setErrorMessage("No speech detected. Please try again.");
      setState("error");
      return;
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    workerRef.current?.postMessage({
      type: "recognize",
      audioData,
      expectedText: expectedTextRef.current,
      l1: "pt-BR"
    });
  }, [stopRecording]);

  const reset = useCallback(() => {
    stopRecording();
    setResult(null);
    setErrorMessage("");
    setState("idle");
    chunksRef.current = [];
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [stopRecording]);

  return { state, result, errorMessage, start, stop, reset };
}
