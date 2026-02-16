import { useState, type FragmentProps } from "react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LanguagesIcon,
  XCircleIcon
} from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle
} from "@/components/ui/item";
import {
  ButtonGroup,
  ButtonGroupSeparator
} from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import SpeakingPractice from "@/components/Study/SpeakingPractice";

const copyTitleMap = {
  idle: "Copy transcript",
  copied: "Transcript copied",
  error: "Failed to copy transcript"
} as const;

const copyIconMap = {
  idle: <CopyIcon />,
  copied: <CheckIcon />,
  error: <AlertCircleIcon />
} as const;

const Transcript = ({
  children,
  onTranslate,
  onCorrect,
  onIncorrect
}: FragmentProps & {
  onTranslate: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
}) => {
  const [isShown, setIsShown] = useState(false);
  const { state, copy } = useCopyToClipboard();

  const handleShowTranscript = () => setIsShown(true);

  const handleCopy = () => copy(children as string);

  if (!isShown) {
    return (
      <Button
        variant="outline"
        className="w-full animate-in fade-in-0 duration-500"
        onClick={handleShowTranscript}
      >
        <EyeIcon />
        Show transcript
      </Button>
    );
  }

  return (
    <>
      <Item variant="muted" size="sm" className="animate-flip">
        <ItemContent>
          <ItemTitle>
            <blockquote className="text-pretty italic">"{children}"</blockquote>
          </ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button
            variant="outline"
            className="size-8"
            title={copyTitleMap[state]}
            aria-label={copyTitleMap[state]}
            onClick={handleCopy}
          >
            {copyIconMap[state]}
          </Button>
          <Button
            variant="outline"
            className="size-8"
            title="Translate transcript"
            aria-label="Translate transcript"
            onClick={onTranslate}
          >
            <LanguagesIcon />
          </Button>
        </ItemActions>
      </Item>
      <SpeakingPractice transcript={children as string} />
      <ButtonGroup>
        <Button variant="destructive" onClick={onIncorrect}>
          <XCircleIcon />
          Incorrect
        </Button>
        <ButtonGroupSeparator />
        <Button className="bg-green-600 hover:bg-green-700" onClick={onCorrect}>
          <CheckCircleIcon />
          Correct
        </Button>
      </ButtonGroup>
    </>
  );
};

export default Transcript;
