import type { ComponentProps } from "react";
import { MicIcon, XIcon } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const SpeakComingSoon = ({ ...props }: ComponentProps<typeof Alert>) => {
  const [dismissed, setDismissed] = useLocalStorage(
    "englitune-speak-coming-soon",
    false
  );

  return (
    !dismissed && (
      <Alert {...props}>
        <MicIcon />
        <AlertTitle className="space-x-1.5">
          <span>Coming soon!</span>
          <span>{"\u{1F680}"}</span>
        </AlertTitle>
        <AlertDescription>
          AI-powered speak practice to boost your pronunciation.
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2"
          onClick={() => setDismissed(true)}
        >
          <XIcon />
          <span className="sr-only">Dismiss</span>
        </Button>
      </Alert>
    )
  );
};

export default SpeakComingSoon;
