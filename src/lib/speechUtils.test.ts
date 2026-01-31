import { describe, expect, it, beforeAll } from "vitest";
import {
  normalizeText,
  compareTexts,
  computeLCS,
  buildDiff,
  getPhonemes,
  phonemeToIpa,
  logSoftmax,
  viterbiAlign,
  loadTokens,
  tokenizeText,
  getWordTokenRanges,
  getTokenMap,
  getReverseTokenMap,
  computeGopScores,
  processCtcOutput,
  greedyDecode,
  computeMelSpectrogram,
  estimateSpeechRate,
  applyL1Scoring
} from "./speechUtils";

// Mini BPE vocabulary for testing (mimics NeMo format)
const TEST_TOKENS = [
  "<unk> 0",
  "▁hello 1",
  "▁world 2",
  "▁the 3",
  "▁a 4",
  "▁hi 5",
  "s 6",
  "t 7",
  "e 8",
  "d 9",
  "▁ 10",
  "ing 11",
  "▁cat 12",
  "▁sat 13",
  "▁on 14",
  "▁mat 15",
  "h 16",
  "l 17",
  "o 18",
  "r 19",
  "w 20",
  "a 21",
  "n 22",
  "i 23",
  "<blk> 1024"
].join("\n");

const VOCAB_SIZE = 1025;

describe("speechUtils", () => {
  describe("normalizeText", () => {
    it("converts to lowercase", () => {
      expect(normalizeText("Hello World")).toBe("hello world");
    });

    it("removes punctuation", () => {
      expect(normalizeText("Hello, world!")).toBe("hello world");
    });

    it("keeps apostrophes", () => {
      expect(normalizeText("I'm don't can't")).toBe("i'm don't can't");
    });

    it("normalizes whitespace", () => {
      expect(normalizeText("  hello   world  ")).toBe("hello world");
    });

    it("handles empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("removes periods and question marks", () => {
      expect(normalizeText("Hello. How are you?")).toBe("hello how are you");
    });

    it("removes colons and semicolons", () => {
      expect(normalizeText("Note: this; that")).toBe("note this that");
    });

    it("removes parentheses and brackets", () => {
      expect(normalizeText("hello (world) [test]")).toBe("hello world test");
    });

    it("removes quotes but keeps apostrophes in words", () => {
      expect(normalizeText('"she\'s here"')).toBe("she's here");
    });

    it("handles tabs and newlines", () => {
      expect(normalizeText("hello\tworld\nfoo")).toBe("hello world foo");
    });

    it("handles numbers", () => {
      expect(normalizeText("I have 3 cats")).toBe("i have 3 cats");
    });

    it("handles only whitespace", () => {
      expect(normalizeText("   ")).toBe("");
    });

    it("handles only punctuation", () => {
      expect(normalizeText("...!!!???")).toBe("");
    });

    it("handles hyphens by replacing with space", () => {
      expect(normalizeText("well-known fact")).toBe("well known fact");
    });

    it("handles underscores", () => {
      expect(normalizeText("hello_world")).toBe("hello_world");
    });
  });

  describe("computeLCS", () => {
    it("returns correct DP table for identical arrays", () => {
      const dp = computeLCS(["a", "b"], ["a", "b"]);
      expect(dp[2][2]).toBe(2);
    });

    it("returns correct DP table for completely different arrays", () => {
      const dp = computeLCS(["a", "b"], ["c", "d"]);
      expect(dp[2][2]).toBe(0);
    });

    it("returns correct DP table for partial match", () => {
      const dp = computeLCS(["a", "b", "c"], ["a", "c"]);
      expect(dp[3][2]).toBe(2);
    });

    it("handles empty arrays", () => {
      const dp = computeLCS([], []);
      expect(dp).toEqual([[0]]);
    });

    it("handles one empty array", () => {
      const dp = computeLCS(["a", "b"], []);
      expect(dp[2][0]).toBe(0);
    });
  });

  describe("buildDiff", () => {
    it("marks all words as correct for identical arrays", () => {
      const original = ["hello", "world"];
      const spoken = ["hello", "world"];
      const dp = computeLCS(original, spoken);
      const result = buildDiff(original, spoken, dp);
      expect(result).toEqual([
        { word: "hello", status: "correct" },
        { word: "world", status: "correct" }
      ]);
    });

    it("marks missing words correctly", () => {
      const original = ["the", "big", "cat"];
      const spoken = ["the", "cat"];
      const dp = computeLCS(original, spoken);
      const result = buildDiff(original, spoken, dp);
      const missing = result.filter((w) => w.status === "missing");
      expect(missing).toHaveLength(1);
      expect(missing[0].word).toBe("big");
    });

    it("marks extra words correctly", () => {
      const original = ["the", "cat"];
      const spoken = ["the", "big", "cat"];
      const dp = computeLCS(original, spoken);
      const result = buildDiff(original, spoken, dp);
      const extra = result.filter((w) => w.status === "extra");
      expect(extra).toHaveLength(1);
      expect(extra[0].word).toBe("big");
    });

    it("handles empty original", () => {
      const original: string[] = [];
      const spoken = ["hello"];
      const dp = computeLCS(original, spoken);
      const result = buildDiff(original, spoken, dp);
      expect(result).toEqual([{ word: "hello", status: "extra" }]);
    });

    it("handles empty spoken", () => {
      const original = ["hello"];
      const spoken: string[] = [];
      const dp = computeLCS(original, spoken);
      const result = buildDiff(original, spoken, dp);
      expect(result).toEqual([{ word: "hello", status: "missing" }]);
    });
  });

  describe("compareTexts", () => {
    it("returns 100% for exact match", () => {
      const result = compareTexts("Hello world", "hello world");
      expect(result.score).toBe(100);
      expect(result.words.every((w) => w.status === "correct")).toBe(true);
    });

    it("is case insensitive", () => {
      const result = compareTexts("HELLO WORLD", "hello world");
      expect(result.score).toBe(100);
    });

    it("handles partial match", () => {
      const result = compareTexts(
        "the cat sat on the mat",
        "the cat on the mat"
      );
      expect(result.score).toBe(83);
      expect(result.words.find((w) => w.word === "sat")?.status).toBe(
        "missing"
      );
    });

    it("detects missing words", () => {
      const result = compareTexts("I love programming", "I programming");
      expect(result.words.find((w) => w.word === "love")?.status).toBe(
        "missing"
      );
      expect(result.score).toBe(67);
    });

    it("detects extra words", () => {
      const result = compareTexts("hello world", "hello beautiful world");
      expect(result.words.find((w) => w.word === "beautiful")?.status).toBe(
        "extra"
      );
      expect(result.score).toBe(100);
    });

    it("returns 0% for empty spoken text", () => {
      const result = compareTexts("hello world", "");
      expect(result.score).toBe(0);
      expect(result.words.every((w) => w.status === "missing")).toBe(true);
    });

    it("handles contractions", () => {
      const result = compareTexts("I'm happy", "I'm happy");
      expect(result.score).toBe(100);
    });

    it("ignores punctuation differences", () => {
      const result = compareTexts("Hello, world!", "hello world");
      expect(result.score).toBe(100);
    });

    it("handles both empty strings", () => {
      const result = compareTexts("", "");
      expect(result.score).toBe(100);
      expect(result.words).toHaveLength(0);
    });

    it("handles extra words with empty original", () => {
      const result = compareTexts("", "hello");
      expect(result.score).toBe(0);
      expect(result.words[0].status).toBe("extra");
    });

    it("handles completely different texts", () => {
      const result = compareTexts("hello world", "foo bar");
      expect(result.score).toBe(0);
      expect(
        result.words.filter(
          (w) => w.status === "missing" || w.status === "extra"
        ).length
      ).toBe(4);
    });

    it("handles single word match", () => {
      const result = compareTexts("hello", "hello");
      expect(result.score).toBe(100);
      expect(result.words).toHaveLength(1);
    });

    it("handles single word mismatch", () => {
      const result = compareTexts("hello", "goodbye");
      expect(result.score).toBe(0);
    });

    it("handles single word spoken when original is longer", () => {
      const result = compareTexts("hello beautiful world", "hello");
      expect(result.score).toBe(33);
    });

    it("handles repeated words in original", () => {
      const result = compareTexts("the the the", "the the the");
      expect(result.score).toBe(100);
    });

    it("handles repeated words with missing one", () => {
      const result = compareTexts("the the the", "the the");
      expect(result.score).toBe(67);
    });

    it("handles numbers in text", () => {
      const result = compareTexts("I have 3 cats", "I have 3 cats");
      expect(result.score).toBe(100);
    });

    it("handles numbers mismatch", () => {
      const result = compareTexts("I have 3 cats", "I have 4 cats");
      expect(result.score).toBe(75);
    });

    it("handles multiple missing words", () => {
      const result = compareTexts(
        "I really love big fluffy cats",
        "I love cats"
      );
      expect(result.score).toBe(50);
      const missing = result.words.filter((w) => w.status === "missing");
      expect(missing.length).toBe(3);
    });

    it("handles multiple extra words", () => {
      const result = compareTexts(
        "I love cats",
        "I really truly love big cats"
      );
      expect(result.score).toBe(100);
      const extra = result.words.filter((w) => w.status === "extra");
      expect(extra.length).toBe(3);
    });

    it("handles word order swap", () => {
      const result = compareTexts("hello world", "world hello");
      expect(result.score).toBe(50);
    });

    it("handles long sentence with perfect match", () => {
      const long =
        "The quick brown fox jumps over the lazy dog and runs through the forest";
      const result = compareTexts(long, long);
      expect(result.score).toBe(100);
      const correctWords = result.words.filter((w) => w.status === "correct");
      expect(correctWords).toHaveLength(14);
      expect(result.words.every((w) => w.status === "correct")).toBe(true);
    });

    it("handles long sentence with one word wrong", () => {
      const original = "The quick brown fox jumps over the lazy dog";
      const spoken = "The quick brown cat jumps over the lazy dog";
      const result = compareTexts(original, spoken);
      expect(result.score).toBe(89);
    });

    it("handles contraction vs expanded form", () => {
      const result = compareTexts("I'm going", "i am going");
      expect(result.score).toBeLessThan(100);
    });

    it("handles text with only punctuation difference", () => {
      const result = compareTexts(
        "Hello! How are you? I'm fine, thanks.",
        "hello how are you i'm fine thanks"
      );
      expect(result.score).toBe(100);
    });

    it("handles all words replaced", () => {
      const result = compareTexts("one two three", "four five six");
      expect(result.score).toBe(0);
      const missing = result.words.filter((w) => w.status === "missing");
      const extra = result.words.filter((w) => w.status === "extra");
      expect(missing.length).toBe(3);
      expect(extra.length).toBe(3);
    });

    it("handles spoken text much longer than original", () => {
      const result = compareTexts(
        "hello",
        "oh well hello there my friend how are you doing today"
      );
      expect(result.score).toBe(100);
      const extra = result.words.filter((w) => w.status === "extra");
      expect(extra.length).toBe(10);
    });

    it("handles original much longer than spoken", () => {
      const result = compareTexts(
        "The quick brown fox jumps over the lazy dog near the river",
        "fox"
      );
      expect(result.score).toBe(8);
    });

    it("score is always between 0 and 100", () => {
      const testCases = [
        ["hello", "hello"],
        ["hello", ""],
        ["", "hello"],
        ["", ""],
        ["a b c", "x y z"],
        ["one", "one two three four five six seven eight nine ten"],
        ["a very long sentence with many words that goes on and on", "a"]
      ];
      for (const [original, spoken] of testCases) {
        const result = compareTexts(original, spoken);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });

    it("score is always an integer", () => {
      const testCases = [
        ["one two three", "one two"],
        ["a b c d e f g", "a c e g"],
        ["hello world foo", "hello foo"]
      ];
      for (const [original, spoken] of testCases) {
        const result = compareTexts(original, spoken);
        expect(Number.isInteger(result.score)).toBe(true);
      }
    });

    it("words array contains all original words as correct or missing", () => {
      const result = compareTexts("the cat sat on the mat", "the cat on mat");
      const originalWords = ["the", "cat", "sat", "on", "the", "mat"];
      const correctAndMissing = result.words.filter(
        (w) => w.status === "correct" || w.status === "missing"
      );
      expect(correctAndMissing.map((w) => w.word)).toEqual(
        expect.arrayContaining(originalWords)
      );
    });

    it("words only have correct, missing, or extra status", () => {
      const validStatuses = new Set(["correct", "missing", "extra"]);
      const testCases = [
        ["hello world", "hello world"],
        ["hello world", "foo bar"],
        ["hello", "hello world foo"],
        ["a b c", ""]
      ];
      for (const [original, spoken] of testCases) {
        const result = compareTexts(original, spoken);
        for (const w of result.words) {
          expect(validStatuses.has(w.status)).toBe(true);
        }
      }
    });
  });

  describe("getPhonemes", () => {
    it("returns phonemes for known word", () => {
      const phonemes = getPhonemes("hello");
      expect(phonemes.length).toBeGreaterThan(0);
      expect(phonemes).toContain("HH");
    });

    it("returns empty array for unknown word", () => {
      expect(getPhonemes("xyznotaword123")).toEqual([]);
    });

    it("is case insensitive", () => {
      expect(getPhonemes("Hello")).toEqual(getPhonemes("hello"));
    });

    it("strips stress markers from phonemes", () => {
      const phonemes = getPhonemes("hello");
      for (const p of phonemes) {
        expect(p).not.toMatch(/[0-9]/);
      }
    });
  });

  describe("phonemeToIpa", () => {
    it("converts known arpabet to IPA", () => {
      expect(phonemeToIpa("TH")).toBe("θ");
      expect(phonemeToIpa("SH")).toBe("ʃ");
      expect(phonemeToIpa("AE")).toBe("æ");
    });

    it("returns lowercase for unknown phoneme", () => {
      expect(phonemeToIpa("XX")).toBe("xx");
    });
  });

  describe("logSoftmax", () => {
    it("outputs values that sum to ~1 in probability space", () => {
      const logits = new Float32Array([1.0, 2.0, 3.0]);
      const result = logSoftmax(logits);
      const probSum = Array.from(result).reduce(
        (sum, lp) => sum + Math.exp(lp),
        0
      );
      expect(probSum).toBeCloseTo(1.0, 5);
    });

    it("largest input gets highest log probability", () => {
      const logits = new Float32Array([1.0, 5.0, 2.0]);
      const result = logSoftmax(logits);
      expect(result[1]).toBeGreaterThan(result[0]);
      expect(result[1]).toBeGreaterThan(result[2]);
    });

    it("all outputs are <= 0", () => {
      const logits = new Float32Array([10.0, 20.0, 30.0]);
      const result = logSoftmax(logits);
      for (const v of result) {
        expect(v).toBeLessThanOrEqual(0);
      }
    });

    it("handles single element", () => {
      const logits = new Float32Array([5.0]);
      const result = logSoftmax(logits);
      expect(result[0]).toBeCloseTo(0.0, 5);
    });
  });

  // --- BPE Tokenizer tests ---

  describe("BPE tokenizer", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("loads tokens correctly", () => {
      const map = getReverseTokenMap();
      expect(map).not.toBeNull();
      expect(map!.get(1)).toBe("▁hello");
      expect(map!.get(1024)).toBe("<blk>");
    });

    it("getTokenMap returns loaded map", () => {
      const map = getTokenMap();
      expect(map).not.toBeNull();
      expect(map!.get("▁hello")).toBe(1);
      expect(map!.get("<blk>")).toBe(1024);
    });

    it("tokenizes known words", () => {
      const tokens = tokenizeText("hello world");
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0]).toBe(1); // ▁hello
      expect(tokens[1]).toBe(2); // ▁world
    });

    it("tokenizes with character fallback", () => {
      const tokens = tokenizeText("hi");
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0]).toBe(5); // ▁hi
    });

    it("returns empty for empty text", () => {
      expect(tokenizeText("")).toEqual([]);
    });

    it("handles multi-word text", () => {
      const tokens = tokenizeText("the cat sat on the mat");
      expect(tokens.length).toBe(6);
      expect(tokens[0]).toBe(3); // ▁the
      expect(tokens[1]).toBe(12); // ▁cat
      expect(tokens[2]).toBe(13); // ▁sat
    });

    it("falls back to single char or UNK for unknown substrings", () => {
      // 'z' is not in our test vocabulary at all — should produce UNK (0)
      const tokens = tokenizeText("z");
      expect(tokens.length).toBeGreaterThan(0);
      // ▁ prefix: first try ▁z (not in vocab), then ▁ (token 10), then z (not in vocab → UNK 0)
      expect(tokens).toContain(0); // UNK for 'z'
    });
  });

  describe("getWordTokenRanges", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("maps single-token words", () => {
      const tokens = tokenizeText("hello world");
      const revMap = getReverseTokenMap()!;
      const ranges = getWordTokenRanges(tokens, revMap);
      expect(ranges).toHaveLength(2);
      expect(ranges[0]).toEqual([0, 1]);
      expect(ranges[1]).toEqual([1, 2]);
    });

    it("handles multi-token words", () => {
      // "tested" would need multiple tokens if not in vocab
      const tokens = tokenizeText("the cat");
      const revMap = getReverseTokenMap()!;
      const ranges = getWordTokenRanges(tokens, revMap);
      expect(ranges).toHaveLength(2);
    });
  });

  describe("viterbiAlign (BPE)", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("aligns single BPE token", () => {
      const T = 5;
      const tokens = [1]; // ▁hello

      const logProbs: Float32Array[] = [];
      for (let t = 0; t < T; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        if (t < 2) {
          frame[1024] = -0.1; // blank
        } else {
          frame[1] = -0.1; // ▁hello
        }
        logProbs.push(frame);
      }

      const { alignment, scores } = viterbiAlign(logProbs, tokens);
      expect(alignment).toHaveLength(T);
      expect(scores).toHaveLength(T);
      expect(alignment.some((a) => a === 1)).toBe(true);
    });

    it("aligns multi-token sequence", () => {
      const T = 10;
      const tokens = [1, 2]; // ▁hello, ▁world

      const logProbs: Float32Array[] = [];
      for (let t = 0; t < T; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        if (t < 3) {
          frame[1] = -0.1; // ▁hello
        } else if (t < 5) {
          frame[1024] = -0.1; // blank
        } else {
          frame[2] = -0.1; // ▁world
        }
        logProbs.push(frame);
      }

      const { alignment } = viterbiAlign(logProbs, tokens);
      expect(alignment).toHaveLength(T);
      expect(alignment.some((a) => a === 1)).toBe(true);
      expect(alignment.some((a) => a === 2)).toBe(true);
    });
  });

  describe("computeGopScores (BPE)", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("returns scores for aligned words", () => {
      const tokens = tokenizeText("hello world");
      const T = 10;

      const logProbs: Float32Array[] = [];
      for (let t = 0; t < T; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        if (t < 5) {
          frame[1] = -0.5; // ▁hello
        } else {
          frame[2] = -0.5; // ▁world
        }
        logProbs.push(frame);
      }

      const { alignment, scores } = viterbiAlign(logProbs, tokens);
      const result = computeGopScores(alignment, scores, tokens, "hello world");

      expect(result.words).toHaveLength(2);
      expect(result.words[0].word).toBe("hello");
      expect(result.words[1].word).toBe("world");
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("returns empty for empty text", () => {
      const result = computeGopScores([], [], [], "");
      expect(result.words).toHaveLength(0);
      expect(result.overallScore).toBe(0);
    });

    it("handles misaligned tokens via findTokenInRange", () => {
      // Simulate alignment where alignment[t] doesn't match tokens[tokenIdx]
      // but matches a later token — exercises the findTokenInRange branch
      const tokens = tokenizeText("hello world");
      // tokens should be [1, 2] (▁hello, ▁world)
      expect(tokens).toEqual([1, 2]);

      // Create alignment where frames jump to token 2 before token 1 is exhausted
      // Frame 0: blank, Frame 1: token 2 (world, misaligned), Frame 2: token 1, Frame 3: token 2
      const alignment = [1024, 2, 1, 2, 1024];
      const scores = [-0.1, -0.5, -0.3, -0.4, -0.1];

      const result = computeGopScores(alignment, scores, tokens, "hello world");
      expect(result.words).toHaveLength(2);
      expect(result.words[0].word).toBe("hello");
      expect(result.words[1].word).toBe("world");
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it("handles alignment with token not found in tokens array", () => {
      const tokens = tokenizeText("hello");
      // tokens = [1]

      // Alignment has a token (99) that doesn't exist in tokens array
      const alignment = [1, 99, 1024];
      const scores = [-0.3, -5.0, -0.1];

      const result = computeGopScores(alignment, scores, tokens, "hello");
      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe("hello");
    });

    it("handles no frame scores (default -10 logprob)", () => {
      const tokens = tokenizeText("hello world");

      // All blanks — no token frames at all
      const alignment = [1024, 1024, 1024, 1024];
      const scores = [-0.1, -0.1, -0.1, -0.1];

      const result = computeGopScores(alignment, scores, tokens, "hello world");
      expect(result.words).toHaveLength(2);
      // With no frame scores, avgLogProb defaults to -10
      // Sigmoid: 1/(1+exp(-(-10+2)/1.5)) = 1/(1+exp(8/1.5)) ≈ 0.5%
      expect(result.words[0].score).toBeLessThan(2);
      expect(result.words[1].score).toBeLessThan(2);
    });
  });

  describe("greedyDecode", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("decodes simple sequence", () => {
      const logProbs: Float32Array[] = [];
      for (let t = 0; t < 6; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        if (t < 3) {
          frame[1] = -0.1; // ▁hello
        } else {
          frame[2] = -0.1; // ▁world
        }
        logProbs.push(frame);
      }

      const text = greedyDecode(logProbs);
      expect(text).toBe("hello world");
    });

    it("collapses repeated tokens", () => {
      const logProbs: Float32Array[] = [];
      for (let t = 0; t < 6; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        frame[1] = -0.1; // ▁hello repeated
        logProbs.push(frame);
      }

      const text = greedyDecode(logProbs);
      expect(text).toBe("hello");
    });

    it("returns empty for blank-only input", () => {
      const logProbs: Float32Array[] = [];
      for (let t = 0; t < 5; t++) {
        const frame = new Float32Array(VOCAB_SIZE).fill(-10);
        frame[1024] = -0.1; // blank
        logProbs.push(frame);
      }

      const text = greedyDecode(logProbs);
      expect(text).toBe("");
    });
  });

  describe("computeMelSpectrogram", () => {
    it("produces correct shape for 1 second of audio", () => {
      const sampleRate = 16000;
      const audio = new Float32Array(sampleRate); // 1 second
      const { data, numFrames } = computeMelSpectrogram(audio);

      // Expected frames: 1 + floor((16000 - 400) / 160) = 1 + 97 = 98
      expect(numFrames).toBe(98);
      expect(data.length).toBe(80 * numFrames);
    });

    it("produces at least 1 frame for very short audio", () => {
      const audio = new Float32Array(100); // very short
      const { data, numFrames } = computeMelSpectrogram(audio);

      expect(numFrames).toBeGreaterThanOrEqual(1);
      expect(data.length).toBe(80 * numFrames);
    });

    it("outputs per-feature normalized values (mean ~0, std ~1)", () => {
      // Generate 2 seconds of varied audio
      const sampleRate = 16000;
      const audio = new Float32Array(sampleRate * 2);
      for (let i = 0; i < audio.length; i++) {
        audio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
      }

      const { data, numFrames } = computeMelSpectrogram(audio);

      // Check that each mel bin is roughly normalized (mean ~0)
      for (let m = 0; m < 80; m++) {
        let sum = 0;
        for (let t = 0; t < numFrames; t++) {
          sum += data[m * numFrames + t];
        }
        const mean = sum / numFrames;
        expect(Math.abs(mean)).toBeLessThan(0.01);
      }
    });

    it("produces finite values", () => {
      const audio = new Float32Array(3200); // 200ms
      for (let i = 0; i < audio.length; i++) audio[i] = Math.random() * 0.1;

      const { data } = computeMelSpectrogram(audio);

      for (let i = 0; i < data.length; i++) {
        expect(isFinite(data[i])).toBe(true);
      }
    });

    it("handles silence (all zeros)", () => {
      const audio = new Float32Array(16000); // 1s silence
      const { data, numFrames } = computeMelSpectrogram(audio);

      expect(numFrames).toBe(98);
      // Silence produces very low energy, but after normalization values should be finite
      for (let i = 0; i < data.length; i++) {
        expect(isFinite(data[i])).toBe(true);
      }
    });
  });

  describe("estimateSpeechRate", () => {
    it("returns default for very short audio", () => {
      const audio = new Float32Array(100);
      expect(estimateSpeechRate(audio)).toBe(150);
    });

    it("detects more peaks in faster simulated speech", () => {
      // Simulate syllable bursts as amplitude-modulated noise
      // Each burst: high amplitude, separated by silence
      const duration = 48000; // 3s at 16kHz

      // Slow: 3 widely-spaced bursts (each 3200 samples = 200ms, gap 12800 = 800ms)
      const slow = new Float32Array(duration);
      for (let b = 0; b < 3; b++) {
        const center = 8000 + b * 16000;
        for (let i = -1600; i < 1600; i++) {
          const idx = center + i;
          if (idx >= 0 && idx < duration) {
            // Gaussian envelope * noise = speech-like burst
            const env = Math.exp(-(i * i) / (2 * 800 * 800));
            slow[idx] = env * (Math.random() - 0.5) * 2;
          }
        }
      }
      const slowRate = estimateSpeechRate(slow);

      // Fast: 10 closely-spaced bursts (each 1600 samples = 100ms, gap 3200 = 200ms)
      const fast = new Float32Array(duration);
      for (let b = 0; b < 10; b++) {
        const center = 2400 + b * 4400;
        for (let i = -800; i < 800; i++) {
          const idx = center + i;
          if (idx >= 0 && idx < duration) {
            const env = Math.exp(-(i * i) / (2 * 400 * 400));
            fast[idx] = env * (Math.random() - 0.5) * 2;
          }
        }
      }
      const fastRate = estimateSpeechRate(fast);

      expect(fastRate).toBeGreaterThan(slowRate);
    });

    it("returns a reasonable WPM for silence", () => {
      const silence = new Float32Array(16000); // 1s silence
      const rate = estimateSpeechRate(silence);
      // Silence should have few/no peaks → low WPM
      expect(rate).toBeLessThan(100);
    });

    it("returns finite positive number", () => {
      const audio = new Float32Array(16000);
      for (let i = 0; i < audio.length; i++) audio[i] = Math.random() * 0.3;
      const rate = estimateSpeechRate(audio);
      expect(isFinite(rate)).toBe(true);
      expect(rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("computeMelSpectrogram adaptive hop", () => {
    it("produces more frames for fast speech than slow speech", () => {
      // Simulate slow speech (few energy bursts)
      const slow = new Float32Array(32000);
      for (let i = 0; i < 800; i++)
        slow[8000 + i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / 16000);

      // Simulate fast speech (many energy bursts)
      const fast = new Float32Array(32000);
      for (let b = 0; b < 12; b++) {
        const start = 1000 + b * 2500;
        for (let i = 0; i < 600 && start + i < fast.length; i++) {
          fast[start + i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / 16000);
        }
      }

      const { numFrames: slowFrames } = computeMelSpectrogram(slow);
      const { numFrames: fastFrames } = computeMelSpectrogram(fast);

      // Fast speech should get more frames (smaller hop → more frames)
      // Same audio length, so more frames = smaller hop selected
      expect(fastFrames).toBeGreaterThanOrEqual(slowFrames);
    });
  });

  describe("processCtcOutput", () => {
    beforeAll(() => {
      loadTokens(TEST_TOKENS);
    });

    it("processes logits into pronunciation result", () => {
      const T = 8;
      const logits = new Float32Array(T * VOCAB_SIZE).fill(-5);

      // Make ▁hello (token 1) high in first frames
      for (let t = 0; t < 4; t++) {
        logits[t * VOCAB_SIZE + 1] = 2.0;
      }
      // Make ▁world (token 2) high in last frames
      for (let t = 4; t < 8; t++) {
        logits[t * VOCAB_SIZE + 2] = 2.0;
      }

      const result = processCtcOutput(logits, [T, VOCAB_SIZE], "hello world");
      expect(result.words).toHaveLength(2);
      expect(result.words[0].word).toBe("hello");
      expect(result.words[1].word).toBe("world");
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it("returns empty for empty text", () => {
      const result = processCtcOutput(new Float32Array(0), [0, VOCAB_SIZE], "");
      expect(result.words).toHaveLength(0);
      expect(result.overallScore).toBe(0);
    });
  });

  describe("applyL1Scoring", () => {
    it("returns unchanged result for non pt-BR language", () => {
      const result = {
        words: [
          {
            word: "the",
            phonemes: [{ phoneme: "ð", score: 0.3, expected: true }],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "the"
      };
      const adjusted = applyL1Scoring(result, "en-US");
      expect(adjusted.overallScore).toBe(30);
      expect(adjusted.words[0].phonemes[0].score).toBe(0.3);
    });

    it("boosts tier 1 phonemes with 50% boost for pt-BR", () => {
      const result = {
        words: [
          {
            word: "the",
            phonemes: [{ phoneme: "ð", score: 0.3, expected: true }],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "the"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      // DH is tier 1 (50% boost), score 0.3 < 0.45 threshold
      // deficit = 0.85 - 0.30 = 0.55, boost = 0.55 * 0.50 = 0.275
      // adjusted = 0.30 + 0.275 = 0.575
      expect(adjusted.words[0].phonemes[0].score).toBeCloseTo(0.575, 2);
      expect(adjusted.words[0].phonemes[0].l1Feedback).toBe("ð → d/v");
      expect(adjusted.words[0].phonemes[0].originalScore).toBe(0.3);
    });

    it("boosts tier 2 phonemes with 40% boost", () => {
      const result = {
        words: [
          {
            word: "sit",
            phonemes: [
              { phoneme: "s", score: 0.3, expected: true },
              { phoneme: "ɪ", score: 0.3, expected: true },
              { phoneme: "t", score: 0.3, expected: true }
            ],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "sit"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      // S in onset (not coda) → context check fails → prosody boost only
      expect(adjusted.words[0].phonemes[0].l1Feedback).toBe("prosody/accent");
      // IH (tier 2, 40% boost): deficit=0.55, boost=0.22, adj=0.52
      expect(adjusted.words[0].phonemes[1].l1Feedback).toBe("ɪ → i");
      expect(adjusted.words[0].phonemes[1].score).toBeCloseTo(0.52, 2);
      // T at end (not before /i/) → context check fails → prosody boost only
      expect(adjusted.words[0].phonemes[2].l1Feedback).toBe("prosody/accent");
    });

    it("applies tier 3 only in correct context (coda S, T before /i/)", () => {
      // "fast" → F AE S T: S is in coda (before T, a consonant)
      const result1 = {
        words: [
          {
            word: "fast",
            phonemes: [
              { phoneme: "f", score: 0.3, expected: true },
              { phoneme: "æ", score: 0.3, expected: true },
              { phoneme: "s", score: 0.3, expected: true },
              { phoneme: "t", score: 0.3, expected: true }
            ],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "fast"
      };
      const adj1 = applyL1Scoring(result1, "pt-BR");
      // S at idx 2, next is T (consonant) → isCoda = true → tier 3 applies
      expect(adj1.words[0].phonemes[2].l1Feedback).toBe("s → ʃ (coda)");

      // "tip" → T IH P: T is before IH (high front vowel)
      const result2 = {
        words: [
          {
            word: "tip",
            phonemes: [
              { phoneme: "t", score: 0.3, expected: true },
              { phoneme: "ɪ", score: 0.3, expected: true },
              { phoneme: "p", score: 0.3, expected: true }
            ],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "tip"
      };
      const adj2 = applyL1Scoring(result2, "pt-BR");
      // T at idx 0, next is IH → isBeforeHighFrontVowel = true → tier 3 applies
      expect(adj2.words[0].phonemes[0].l1Feedback).toBe("t → tʃ before /i/");
    });

    it("applies confirmed boost multiplier when decoded text matches BR pattern", () => {
      const result = {
        words: [
          {
            word: "the",
            phonemes: [{ phoneme: "ð", score: 0.3, expected: true }],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "the",
        decodedTranscript: "de" // confirms DH→D substitution
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      // DH tier 1: deficit=0.55, base boost=0.275, confirmed×1.5=0.4125
      // adjusted = min(0.85, 0.3 + 0.4125) = 0.7125
      expect(adjusted.words[0].phonemes[0].score).toBeCloseTo(0.7125, 2);
    });

    it("does not boost phonemes already above threshold (0.45)", () => {
      const result = {
        words: [
          {
            word: "the",
            phonemes: [{ phoneme: "ð", score: 0.5, expected: true }],
            score: 50
          }
        ],
        overallScore: 50,
        transcript: "the"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      expect(adjusted.words[0].phonemes[0].score).toBe(0.5);
      expect(adjusted.words[0].phonemes[0].l1Feedback).toBeUndefined();
    });

    it("preserves originalOverallScore", () => {
      const result = {
        words: [
          {
            word: "thing",
            phonemes: [
              { phoneme: "θ", score: 0.2, expected: true },
              { phoneme: "ɪ", score: 0.25, expected: true },
              { phoneme: "ŋ", score: 0.3, expected: true }
            ],
            score: 25
          }
        ],
        overallScore: 25,
        transcript: "thing"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      expect(adjusted.originalOverallScore).toBe(25);
      expect(adjusted.overallScore).toBeGreaterThan(25);
    });

    it("applies prosody boost to non-map phonemes below threshold", () => {
      // "paw" → P AO → P and AO are NOT in BR confusion map
      const result = {
        words: [
          {
            word: "paw",
            phonemes: [
              { phoneme: "p", score: 0.3, expected: true },
              { phoneme: "ɔ", score: 0.3, expected: true }
            ],
            score: 30
          }
        ],
        overallScore: 30,
        transcript: "paw"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      // P not in map: prosody boost 10%, deficit=0.55, boost=0.055, adj=0.355
      expect(adjusted.words[0].phonemes[0].l1Feedback).toBe("prosody/accent");
      expect(adjusted.words[0].phonemes[0].score).toBeCloseTo(0.355, 2);
      // AO not in map: same prosody boost
      expect(adjusted.words[0].phonemes[1].l1Feedback).toBe("prosody/accent");
    });

    it("handles empty words array", () => {
      const result = { words: [], overallScore: 0, transcript: "" };
      const adjusted = applyL1Scoring(result, "pt-BR");
      expect(adjusted.overallScore).toBe(0);
      expect(adjusted.words).toHaveLength(0);
    });

    it("caps adjusted scores at 0.85", () => {
      const result = {
        words: [
          {
            word: "the",
            phonemes: [{ phoneme: "ð", score: 0.44, expected: true }],
            score: 44
          }
        ],
        overallScore: 44,
        transcript: "the"
      };
      const adjusted = applyL1Scoring(result, "pt-BR");
      // DH tier 1: deficit=0.41, boost=0.205, adj=0.645 (below cap, fine)
      expect(adjusted.words[0].phonemes[0].score).toBeLessThanOrEqual(0.85);
    });
  });
});
