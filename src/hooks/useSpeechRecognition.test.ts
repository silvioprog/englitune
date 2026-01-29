import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import useSpeechRecognition from "./useSpeechRecognition";

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn();
  stop = vi.fn(() => {
    // Simulate async stop - onend fires after stop
    setTimeout(() => this.onend?.(), 0);
  });
  abort = vi.fn();
}

let mockInstance: MockSpeechRecognition;

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    mockInstance = new MockSpeechRecognition();
    vi.stubGlobal("SpeechRecognition", function () {
      return mockInstance;
    });
    vi.stubGlobal("webkitSpeechRecognition", function () {
      return mockInstance;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in idle state when supported", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.state).toBe("idle");
    expect(result.current.isSupported).toBe(true);
    expect(result.current.transcript).toBe("");
    expect(result.current.errorMessage).toBe("");
  });

  it("reports unsupported when SpeechRecognition is not available", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.state).toBe("unsupported");
    expect(result.current.isSupported).toBe(false);
  });

  it("transitions to listening state on start", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe("listening");
    expect(mockInstance.start).toHaveBeenCalledOnce();
    expect(mockInstance.lang).toBe("en-US");
    expect(mockInstance.continuous).toBe(false);
    expect(mockInstance.interimResults).toBe(false);
  });

  it("transitions to done state with transcript on successful recognition", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onresult?.({
        results: [[{ transcript: "hello world", confidence: 0.95 }]]
      });
    });

    expect(result.current.state).toBe("done");
    expect(result.current.transcript).toBe("hello world");
  });

  it("transitions to error state on not-allowed error", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onerror?.({ error: "not-allowed" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "Microphone access denied. Please allow microphone access."
    );
  });

  it("transitions to error state on no-speech error", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onerror?.({ error: "no-speech" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No speech detected. Please try again."
    );
  });

  it("transitions to error state on audio-capture error", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onerror?.({ error: "audio-capture" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No microphone found. Please check your device."
    );
  });

  it("transitions to error state on network error", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onerror?.({ error: "network" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "Network error. Speech recognition requires an internet connection."
    );
  });

  it("handles unknown error types gracefully", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onerror?.({ error: "some-unknown-error" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "Speech recognition error: some-unknown-error"
    );
  });

  it("transitions to error when onend fires while still listening (no speech detected)", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    // onend fires without any result (user didn't speak)
    act(() => {
      mockInstance.onend?.();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No speech detected. Please try again."
    );
  });

  it("does not change state when onend fires after successful recognition", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onresult?.({
        results: [[{ transcript: "hello", confidence: 0.9 }]]
      });
    });

    expect(result.current.state).toBe("done");

    // onend fires after result - should stay in "done"
    act(() => {
      mockInstance.onend?.();
    });

    expect(result.current.state).toBe("done");
  });

  it("transitions to processing state on stop", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("processing");
    expect(mockInstance.stop).toHaveBeenCalledOnce();
  });

  it("transitions to error when onend fires in processing state without result", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("processing");

    // onend fires without any result (user stopped before speaking)
    act(() => {
      mockInstance.onend?.();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toBe(
      "No speech detected. Please try again."
    );
  });

  it("resets to idle state on reset", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onresult?.({
        results: [[{ transcript: "hello", confidence: 0.9 }]]
      });
    });

    expect(result.current.state).toBe("done");
    expect(result.current.transcript).toBe("hello");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.transcript).toBe("");
    expect(result.current.errorMessage).toBe("");
    expect(mockInstance.abort).toHaveBeenCalled();
  });

  it("aborts previous recognition instance on new start", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    const firstInstance = mockInstance;

    // Create a new mock for the second start
    mockInstance = new MockSpeechRecognition();
    vi.stubGlobal("SpeechRecognition", function () {
      return mockInstance;
    });

    act(() => {
      result.current.start();
    });

    expect(firstInstance.abort).toHaveBeenCalled();
    expect(result.current.state).toBe("listening");
  });

  it("clears previous transcript and errors on new start", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    // First attempt - error
    act(() => {
      result.current.start();
    });
    act(() => {
      mockInstance.onerror?.({ error: "no-speech" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).not.toBe("");

    // Second attempt - should clear previous state
    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe("listening");
    expect(result.current.transcript).toBe("");
    expect(result.current.errorMessage).toBe("");
  });

  it("does nothing when start is called and not supported", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe("unsupported");
  });

  it("aborts recognition on unmount", () => {
    const { unmount } = renderHook(() => useSpeechRecognition());

    // Need to start first to create a recognition instance
    // The cleanup runs on unmount
    unmount();

    // The abort is called in the cleanup effect
    // Since we didn't start, there's no instance to abort
    // This test just ensures no errors on unmount
  });

  it("aborts active recognition on unmount", () => {
    const { result, unmount } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    unmount();

    expect(mockInstance.abort).toHaveBeenCalled();
  });

  it("handles empty transcript result", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onresult?.({
        results: [[{ transcript: "", confidence: 0 }]]
      });
    });

    expect(result.current.state).toBe("done");
    expect(result.current.transcript).toBe("");
  });

  it("handles missing results gracefully", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.start();
    });

    act(() => {
      mockInstance.onresult?.({ results: [] });
    });

    expect(result.current.state).toBe("done");
    expect(result.current.transcript).toBe("");
  });
});
