import { useMemo } from "react";
import {
  LoaderCircleIcon,
  MicIcon,
  MicOffIcon,
  RotateCcwIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { compareTexts, type WordResult } from "@/lib/speechUtils";

const statusStyles: Record<WordResult["status"], string> = {
  correct: "text-green-600 dark:text-green-400",
  missing: "text-red-500 line-through dark:text-red-400",
  extra: "text-orange-500 italic dark:text-orange-400"
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {score}%
    </span>
  );
}

const SpeakingPractice = ({ transcript }: { transcript: string }) => {
  const {
    state,
    transcript: spoken,
    errorMessage,
    isSupported,
    start,
    stop,
    reset
  } = useSpeechRecognition();

  const result = useMemo(() => {
    if (state !== "done" || !spoken) return null;
    return compareTexts(transcript, spoken);
  }, [state, spoken, transcript]);

  if (!isSupported) return null;

  if (state === "done" && result) {
    return (
      <div className="flex flex-col gap-2 animate-in fade-in-0 duration-300">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-sm leading-relaxed">
            {result.words.map((w, i) => (
              <span key={i} className={statusStyles[w.status]}>
                {w.word}{" "}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <ScoreBadge score={result.score} />
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
        <Button variant="outline" className="w-full" onClick={start}>
          <MicIcon />
          Try again
        </Button>
      </div>
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
      onClick={start}
    >
      <MicIcon />
      Practice speaking
    </Button>
  );
};

export default SpeakingPractice;
