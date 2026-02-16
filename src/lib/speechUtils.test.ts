import { describe, expect, it } from "vitest";
import {
  normalizeText,
  compareTexts,
  computeLCS,
  buildDiff
} from "./speechUtils";

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

    // Edge cases and stress tests

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
      // LCS finds one match (either hello or world), score = 50%
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
      // "i'm" vs "i" and "am" - different words
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
      expect(result.score).toBe(100); // "hello" found in spoken
      const extra = result.words.filter((w) => w.status === "extra");
      expect(extra.length).toBe(10);
    });

    it("handles original much longer than spoken", () => {
      const result = compareTexts(
        "The quick brown fox jumps over the lazy dog near the river",
        "fox"
      );
      expect(result.score).toBe(8); // 1/12 = 8%
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
});
