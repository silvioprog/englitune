import { type FragmentProps } from "react";
import { SparklesIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Logo from "@/components/Logo";
import List from "@/components/Welcome/List";
import Item from "@/components/Welcome/Item";
import useWelcomeStorage from "@/hooks/useWelcomeStorage";

const Welcome = ({ children }: FragmentProps) => {
  const { shown, hide } = useWelcomeStorage();

  if (!shown) {
    return children;
  }

  return (
    <Dialog open onOpenChange={hide}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>
            <Logo>Welcome to Englitune!</Logo>
          </DialogTitle>
          <DialogDescription>
            Your personalized English learning companion that helps you master
            the language through spaced repetition and audio-based practice.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Here's how it works:</AlertTitle>
          <AlertDescription className="mt-1">
            <List>
              <Item icon="play-circle">
                Listen to audio clips in English from{" "}
                <span className="font-semibold text-primary">
                  +44k available clips
                </span>
                .
              </Item>
              <Item icon="check-circle-2">
                Mark whether you understood each clip or not.
              </Item>
              <Item icon="clock">
                Review items at optimal intervals for better retention.
              </Item>
              <Item icon="chart-line">
                Track your progress as you master new content.
              </Item>
            </List>
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button className="w-full" onClick={hide}>
            <SparklesIcon size={16} />
            Let's start learning!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Welcome;
