export interface WordResult {
  word: string;
  status: "correct" | "missing" | "extra";
}

export interface CompareResult {
  words: WordResult[];
  score: number;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

export function buildDiff(
  original: string[],
  spoken: string[],
  dp: number[][]
): WordResult[] {
  const results: WordResult[] = [];
  let i = original.length;
  let j = spoken.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === spoken[j - 1]) {
      results.push({ word: original[i - 1], status: "correct" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      results.push({ word: spoken[j - 1], status: "extra" });
      j--;
    } else {
      results.push({ word: original[i - 1], status: "missing" });
      i--;
    }
  }

  return results.reverse();
}

export function compareTexts(original: string, spoken: string): CompareResult {
  const normOriginal = normalizeText(original);
  const normSpoken = normalizeText(spoken);

  if (!normOriginal) {
    const extraWords = normSpoken ? normSpoken.split(" ") : [];
    return {
      words: extraWords.map((w) => ({ word: w, status: "extra" })),
      score: extraWords.length === 0 ? 100 : 0
    };
  }

  const originalWords = normOriginal.split(" ");
  const spokenWords = normSpoken ? normSpoken.split(" ") : [];

  if (spokenWords.length === 0) {
    return {
      words: originalWords.map((w) => ({ word: w, status: "missing" })),
      score: 0
    };
  }

  const dp = computeLCS(originalWords, spokenWords);
  const words = buildDiff(originalWords, spokenWords, dp);

  const correctCount = words.filter((w) => w.status === "correct").length;
  const score = Math.round((correctCount / originalWords.length) * 100);

  return { words, score };
}
