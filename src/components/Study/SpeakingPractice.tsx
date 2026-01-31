import {
  LoaderCircleIcon,
  MicIcon,
  MicOffIcon,
  RotateCcwIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import type {
  PhonemeScore,
  WordPronunciationResult,
  PronunciationResult
} from "@/lib/types";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 50)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function getPhonemeTitle(ph: PhonemeScore): string {
  const pct = Math.round(ph.score * 100);
  if (ph.l1Feedback && ph.originalScore !== undefined) {
    const origPct = Math.round(ph.originalScore * 100);
    return `${ph.phoneme}: ${origPct}% → ${pct}% (${ph.l1Feedback})`;
  }
  return `${ph.phoneme}: ${pct}%`;
}

function ScoreBadge({
  score,
  originalScore
}: {
  score: number;
  originalScore?: number;
}) {
  const hasAdjustment = originalScore !== undefined && originalScore !== score;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getScoreBg(score)}`}
      >
        {score}%
      </span>
      {hasAdjustment && (
        <span className="text-[10px] text-muted-foreground">
          ({originalScore}% raw)
        </span>
      )}
    </span>
  );
}

function PhonemeDisplay({ phonemes }: { phonemes: PhonemeScore[] }) {
  return (
    <span className="inline-flex gap-0.5">
      {phonemes.map((ph, i) => {
        const hasL1 = !!ph.l1Feedback;
        return (
          <span
            key={i}
            className={`text-xs font-mono ${getScoreColor(ph.score * 100)}${hasL1 ? " underline decoration-dotted decoration-current" : ""}`}
            title={getPhonemeTitle(ph)}
          >
            {ph.phoneme}
          </span>
        );
      })}
    </span>
  );
}

function WordResult({ word }: { word: WordPronunciationResult }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5 mx-1">
      <span className={`text-sm font-medium ${getScoreColor(word.score)}`}>
        {word.word}
      </span>
      <PhonemeDisplay phonemes={word.phonemes} />
    </span>
  );
}

function DecodedTranscript({ result }: { result: PronunciationResult }) {
  if (!result.decodedTranscript) return null;
  return (
    <p className="text-[11px] text-muted-foreground mt-1">
      <span className="font-medium">Heard:</span>{" "}
      <span className="font-mono">{result.decodedTranscript}</span>
    </p>
  );
}

const SpeakingPractice = ({ transcript }: { transcript: string }) => {
  const { state, result, errorMessage, start, stop, reset } =
    useSpeechRecognition();

  if (state === "done" && result) {
    return (
      <div className="flex flex-col gap-2 animate-in fade-in-0 duration-300">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex flex-wrap leading-relaxed">
            {result.words.map((w, i) => (
              <WordResult key={i} word={w} />
            ))}
          </div>
          <DecodedTranscript result={result} />
        </div>
        <div className="flex items-center justify-between">
          <ScoreBadge
            score={result.overallScore}
            originalScore={result.originalOverallScore}
          />
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcwIcon />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-2 animate-in fade-in-0 duration-300">
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => start(transcript)}
        >
          <MicIcon />
          Try again
        </Button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <Button variant="outline" className="w-full" disabled>
        <LoaderCircleIcon className="animate-spin" />
        Loading model...
      </Button>
    );
  }

  if (state === "processing") {
    return (
      <Button variant="outline" className="w-full" disabled>
        <LoaderCircleIcon className="animate-spin" />
        Processing...
      </Button>
    );
  }

  if (state === "listening") {
    return (
      <Button variant="outline" className="w-full animate-pulse" onClick={stop}>
        <MicOffIcon />
        Listening...
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full animate-in fade-in-0 duration-500"
      onClick={() => start(transcript)}
    >
      <MicIcon />
      Practice speaking
    </Button>
  );
};

export default SpeakingPractice;
