// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SpeakingPractice from "./SpeakingPractice";
import type { PronunciationResult } from "@/lib/types";

let mockState = "idle";
let mockResult: PronunciationResult | null = null;
let mockErrorMessage = "";
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockReset = vi.fn();

vi.mock("@/hooks/useSpeechRecognition", () => ({
  default: () => ({
    get state() {
      return mockState;
    },
    get result() {
      return mockResult;
    },
    get errorMessage() {
      return mockErrorMessage;
    },
    start: mockStart,
    stop: mockStop,
    reset: mockReset
  })
}));

function makeResult(
  words: { word: string; score: number }[],
  overallScore: number
): PronunciationResult {
  return {
    words: words.map((w) => ({
      word: w.word,
      phonemes: [{ phoneme: w.word[0], score: w.score / 100, expected: true }],
      score: w.score
    })),
    overallScore,
    transcript: words.map((w) => w.word).join(" ")
  };
}

describe("SpeakingPractice", () => {
  beforeEach(() => {
    cleanup();
    mockState = "idle";
    mockResult = null;
    mockErrorMessage = "";
    mockStart.mockClear();
    mockStop.mockClear();
    mockReset.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Practice speaking button in idle state", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    expect(screen.getByText("Practice speaking")).toBeInTheDocument();
  });

  it("calls start with transcript when Practice speaking is clicked", () => {
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Practice speaking"));
    expect(mockStart).toHaveBeenCalledWith("Hello world");
  });

  it("shows Loading model state", () => {
    mockState = "loading";
    render(<SpeakingPractice transcript="Hello world" />);
    expect(screen.getByText("Loading model...")).toBeInTheDocument();
  });

  it("shows Listening state", () => {
    mockState = "listening";
    render(<SpeakingPractice transcript="Hello world" />);
    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("stops listening when Listening button is clicked", () => {
    mockState = "listening";
    render(<SpeakingPractice transcript="Hello world" />);
    fireEvent.click(screen.getByText("Listening..."));
    expect(mockStop).toHaveBeenCalledOnce();
  });

  it("shows Processing state", () => {
    mockState = "processing";
    render(<SpeakingPractice transcript="Hello world" />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("shows phoneme results after recognition", () => {
    mockState = "done";
    mockResult = makeResult(
      [
        { word: "hello", score: 90 },
        { word: "world", score: 85 }
      ],
      88
    );
    render(<SpeakingPractice transcript="Hello world" />);

    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows green score badge for high score (>=80%)", () => {
    mockState = "done";
    mockResult = makeResult([{ word: "hello", score: 90 }], 90);
    render(<SpeakingPractice transcript="hello" />);

    const badge = screen.getByText("90%");
    expect(badge.className).toContain("bg-green");
  });

  it("shows yellow score badge for medium score (50-79%)", () => {
    mockState = "done";
    mockResult = makeResult([{ word: "hello", score: 60 }], 60);
    render(<SpeakingPractice transcript="hello" />);

    const badge = screen.getByText("60%");
    expect(badge.className).toContain("bg-yellow");
  });

  it("shows red score badge for low score (<50%)", () => {
    mockState = "done";
    mockResult = makeResult([{ word: "hello", score: 30 }], 30);
    render(<SpeakingPractice transcript="hello" />);

    const badge = screen.getByText("30%");
    expect(badge.className).toContain("bg-red");
  });

  it("resets when Try again is clicked in done state", () => {
    mockState = "done";
    mockResult = makeResult([{ word: "hello", score: 85 }], 85);
    render(<SpeakingPractice transcript="hello" />);

    fireEvent.click(screen.getByText("Try again"));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("shows error message", () => {
    mockState = "error";
    mockErrorMessage =
      "Microphone access denied. Please allow microphone access.";
    render(<SpeakingPractice transcript="Hello world" />);

    expect(
      screen.getByText(
        "Microphone access denied. Please allow microphone access."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("allows retry from error state", () => {
    mockState = "error";
    mockErrorMessage = "No speech detected. Please try again.";
    render(<SpeakingPractice transcript="Hello world" />);

    fireEvent.click(screen.getByText("Try again"));
    expect(mockStart).toHaveBeenCalledWith("Hello world");
  });

  it("shows word scores with correct colors", () => {
    mockState = "done";
    mockResult = makeResult(
      [
        { word: "hello", score: 90 },
        { word: "world", score: 30 }
      ],
      60
    );
    render(<SpeakingPractice transcript="hello world" />);

    const helloElement = screen.getByText("hello");
    expect(helloElement.className).toContain("text-green");

    const worldElement = screen.getByText("world");
    expect(worldElement.className).toContain("text-red");
  });

  it("shows idle button when done but result is null", () => {
    mockState = "done";
    mockResult = null;
    render(<SpeakingPractice transcript="hello" />);
    expect(screen.getByText("Practice speaking")).toBeInTheDocument();
  });

  it("shows decoded transcript when available", () => {
    mockState = "done";
    mockResult = {
      ...makeResult([{ word: "the", score: 60 }], 60),
      decodedTranscript: "de"
    };
    render(<SpeakingPractice transcript="the" />);

    expect(screen.getByText("Heard:")).toBeInTheDocument();
    expect(screen.getByText("de")).toBeInTheDocument();
  });

  it("shows original score when L1 adjustment applied", () => {
    mockState = "done";
    mockResult = {
      ...makeResult([{ word: "the", score: 70 }], 70),
      originalOverallScore: 55
    };
    render(<SpeakingPractice transcript="the" />);

    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("(55% raw)")).toBeInTheDocument();
  });

  it("does not show original score when no adjustment", () => {
    mockState = "done";
    mockResult = makeResult([{ word: "hello", score: 85 }], 85);
    render(<SpeakingPractice transcript="hello" />);

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.queryByText(/raw/)).not.toBeInTheDocument();
  });

  it("shows L1 feedback in phoneme tooltip", () => {
    mockState = "done";
    mockResult = {
      words: [
        {
          word: "the",
          phonemes: [
            {
              phoneme: "ð",
              score: 0.65,
              expected: true,
              l1Feedback: "ð → d/v",
              originalScore: 0.42
            },
            { phoneme: "ə", score: 0.7, expected: true }
          ],
          score: 68
        }
      ],
      overallScore: 68,
      transcript: "the"
    };
    render(<SpeakingPractice transcript="the" />);

    const phoneme = screen.getByText("ð");
    expect(phoneme.getAttribute("title")).toBe("ð: 42% → 65% (ð → d/v)");
    expect(phoneme.className).toContain("underline");
  });

  it("does not underline phonemes without L1 feedback", () => {
    mockState = "done";
    mockResult = {
      words: [
        {
          word: "cat",
          phonemes: [
            { phoneme: "k", score: 0.9, expected: true },
            { phoneme: "æ", score: 0.85, expected: true },
            { phoneme: "t", score: 0.88, expected: true }
          ],
          score: 88
        }
      ],
      overallScore: 88,
      transcript: "cat"
    };
    render(<SpeakingPractice transcript="cat" />);

    const phoneme = screen.getByText("k");
    expect(phoneme.className).not.toContain("underline");
    expect(phoneme.getAttribute("title")).toBe("k: 90%");
  });
});
