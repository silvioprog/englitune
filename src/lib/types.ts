export interface Entry {
  transcript: string;
  sequence: string;
  speaker: string;
  age: number;
  gender: string;
  accent: string;
  region?: string;
}

export interface Study {
  step: number;
  review: Date;
  incorrect: number;
  entry: Entry;
}

export interface GroupedSequences {
  [speaker: string]: string[];
}

export interface PhonemeScore {
  phoneme: string;
  score: number;
  expected: boolean;
  /** Set when L1 scoring is applied and this phoneme was adjusted */
  l1Feedback?: string;
  /** Original score before L1 adjustment */
  originalScore?: number;
}

export interface WordPronunciationResult {
  word: string;
  phonemes: PhonemeScore[];
  score: number;
  /** Original score before L1 adjustment */
  originalScore?: number;
}

export interface PronunciationResult {
  words: WordPronunciationResult[];
  overallScore: number;
  transcript: string;
  /** CTC greedy decode output (what the model actually heard) */
  decodedTranscript?: string;
  /** Original overall score before L1 adjustment */
  originalOverallScore?: number;
}

export interface SttWorkerRequest {
  type: "init" | "recognize";
  audioData?: Float32Array;
  expectedText?: string;
  modelUrl?: string;
  /** L1 language code for accent-aware scoring (e.g. "pt-BR") */
  l1?: string;
}

export interface SttWorkerResponse {
  type: "ready" | "result" | "error" | "progress";
  result?: PronunciationResult;
  error?: string;
  progress?: number;
}
