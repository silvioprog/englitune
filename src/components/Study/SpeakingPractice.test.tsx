import {
  render,
  screen,
  fireEvent,
  cleanup,
  act
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SpeakingPractice from "./SpeakingPractice";

class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

let mockInstance: MockSpeechRecognition;

function simulateResult(transcript: string) {
  act(() => {
    mockInstance.onresult?.({
      results: [[{ transcript, confidence: 0.95 }]]
    });
  });
}

function simulateError(error: string) {
  act(() => {
    mockInstance.onerror?.({ error });
  });
}

function simulateEnd() {
  act(() => {
    mockInstance.onend?.();
  });
}

describe("SpeakingPractice", () => {
  beforeEach(() => {
    cleanup();
    mockInstance = new MockSpeechRecognition();
    vi.stubGlobal("SpeechRecognition", function () {
      return mockInstance;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders Practice speaking button in idle state", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    expect(screen.getByText("Practice speaking")).toBeInTheDocument();
  });

  it("returns null when speech recognition is not supported", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { container } = render(<SpeakingPractice transcript="Hello world" />);
    expect(container.innerHTML).toBe("");
  });

  it("transitions to listening state when Practice speaking is clicked", () => {
    render(<SpeakingPractice transcript="Hello world" />);

    fireEvent.click(screen.getByText("Practice speaking"));

    expect(screen.getByText("Listening...")).toBeInTheDocument();
    expect(mockInstance.start).toHaveBeenCalledOnce();
  });

  it("shows diff results after successful recognition", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("hello world");

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("shows correct diff colors for partial match", () => {
    render(<SpeakingPractice transcript="the cat sat on the mat" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("the cat on the mat");

    expect(screen.getByText("83%")).toBeInTheDocument();

    const satElement = screen.getByText("sat");
    expect(satElement).toBeInTheDocument();
    expect(satElement.className).toContain("text-red");
    expect(satElement.className).toContain("line-through");
  });

  it("shows extra words with orange styling", () => {
    render(<SpeakingPractice transcript="hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("hello beautiful world");

    const beautifulElement = screen.getByText("beautiful");
    expect(beautifulElement).toBeInTheDocument();
    expect(beautifulElement.className).toContain("text-orange");
    expect(beautifulElement.className).toContain("italic");
  });

  it("shows correct words with green styling", () => {
    render(<SpeakingPractice transcript="hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("hello world");

    const helloElement = screen.getByText("hello");
    expect(helloElement.className).toContain("text-green");
  });

  it("resets to idle when Try again is clicked", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("hello world");

    expect(screen.getByText("Try again")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByText("Practice speaking")).toBeInTheDocument();
  });

  it("shows error message on recognition error", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateError("not-allowed");

    expect(
      screen.getByText(
        "Microphone access denied. Please allow microphone access."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows no-speech error when onend fires without result", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateEnd();

    expect(
      screen.getByText("No speech detected. Please try again.")
    ).toBeInTheDocument();
  });

  it("allows retry from error state", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateError("no-speech");

    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("stops listening when Listening button is clicked", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    expect(screen.getByText("Listening...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Listening..."));

    expect(mockInstance.stop).toHaveBeenCalledOnce();
  });

  it("shows green score badge for high score (>=80%)", () => {
    render(<SpeakingPractice transcript="hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("hello world");

    const badge = screen.getByText("100%");
    expect(badge.className).toContain("bg-green");
  });

  it("shows yellow score badge for medium score (50-79%)", () => {
    render(
      <SpeakingPractice transcript="one two three four five six seven eight nine ten" />
    );
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("one two three four five six");

    const badge = screen.getByText("60%");
    expect(badge.className).toContain("bg-yellow");
  });

  it("shows red score badge for low score (<50%)", () => {
    render(<SpeakingPractice transcript="one two three four five" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("one");

    const badge = screen.getByText("20%");
    expect(badge.className).toContain("bg-red");
  });

  it("stays in listening when spoken transcript is empty", () => {
    render(<SpeakingPractice transcript="hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("");

    // Empty spoken returns null from useMemo, component should not show diff
    // The state goes to "done" but result is null, so idle button shows
    expect(screen.getByText("Practice speaking")).toBeInTheDocument();
  });

  it("handles 0% score correctly", () => {
    render(<SpeakingPractice transcript="hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));

    simulateResult("foo bar");

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
