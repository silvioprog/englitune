// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import useSpeechRecognition from "./useSpeechRecognition";

let workerMessageHandler: ((event: MessageEvent) => void) | null = null;
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = mockPostMessage;
  terminate = mockTerminate;

  constructor() {
    // Capture the message handler for test simulation
    setTimeout(() => {
      workerMessageHandler = this.onmessage;
    }, 0);
  }
}

const mockGetUserMedia = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockTrackStop = vi.fn();
const mockContextClose = vi.fn(() => Promise.resolve());

const mockProcessor = {
  onaudioprocess: null as
    | ((e: {
        inputBuffer: { getChannelData: (ch: number) => Float32Array };
      }) => void)
    | null,
  connect: mockConnect,
  disconnect: mockDisconnect
};

const mockSource = {
  connect: mockConnect
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => mockSource),
  createScriptProcessor: vi.fn(() => mockProcessor),
  close: mockContextClose,
  destination: {}
};

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    workerMessageHandler = null;

    vi.stubGlobal("Worker", class extends MockWorker {});

    vi.stubGlobal("AudioContext", function () {
      return mockAudioContext;
    });

    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mockTrackStop }]
    });

    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: mockGetUserMedia }
    });

    mockPostMessage.mockClear();
    mockTerminate.mockClear();
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockTrackStop.mockClear();
    mockContextClose.mockClear();
    mockGetUserMedia.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.state).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBe("");
  });

  it("initializes worker and sends init message on start", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: "/models/stt-nemo-ctc-small-int4.onnx"
    });
  });

  it("transitions to loading when model not ready", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    expect(result.current.state).toBe("loading");
  });

  it("transitions to listening after model ready and getUserMedia succeeds", async () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    // Simulate worker becoming ready
    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    // Wait for interval to detect readiness
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Wait for getUserMedia promise
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state).toBe("listening");
  });

  it("transitions to processing on stop", async () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Simulate recording some audio
    act(() => {
      mockProcessor.onaudioprocess?.({
        inputBuffer: { getChannelData: () => new Float32Array([0.1, 0.2]) }
      });
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("processing");
  });

  it("transitions to error when stop with no audio", async () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No speech detected. Please try again."
    );
  });

  it("transitions to done with result on worker result message", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    const mockResult = {
      words: [{ word: "hello", phonemes: [], score: 85 }],
      overallScore: 85,
      transcript: "hello"
    };

    act(() => {
      workerMessageHandler?.({
        data: { type: "result", result: mockResult }
      } as MessageEvent);
    });

    expect(result.current.state).toBe("done");
    expect(result.current.result).toEqual(mockResult);
  });

  it("transitions to error on worker error message", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({
        data: { type: "error", error: "Model failed to load" }
      } as MessageEvent);
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe("Model failed to load");
  });

  it("resets state correctly", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({
        data: {
          type: "result",
          result: {
            words: [],
            overallScore: 50,
            transcript: "hello"
          }
        }
      } as MessageEvent);
    });

    expect(result.current.state).toBe("done");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBe("");
  });

  it("terminates worker on unmount", () => {
    const { result, unmount } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    unmount();
    expect(mockTerminate).toHaveBeenCalled();
  });

  it("handles microphone denied error", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "Microphone access denied. Please allow microphone access."
    );
  });

  it("handles no microphone found error", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("No device", "NotFoundError")
    );

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No microphone found. Please check your device."
    );
  });

  it("sends audio data to worker on stop", async () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start("hello world");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    act(() => {
      workerMessageHandler?.({ data: { type: "ready" } } as MessageEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      mockProcessor.onaudioprocess?.({
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3])
        }
      });
    });

    act(() => {
      result.current.stop();
    });

    const recognizeCall = mockPostMessage.mock.calls.find(
      (call) => call[0].type === "recognize"
    );
    expect(recognizeCall).toBeTruthy();
    expect(recognizeCall![0].expectedText).toBe("hello world");
    expect(recognizeCall![0].audioData).toBeInstanceOf(Float32Array);
  });
});
