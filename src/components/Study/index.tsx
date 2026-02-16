import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Container from "@/components/Study/Container";
import Loading from "@/components/Study/Loading";
import Error from "@/components/Study/Error";
import Congratulations from "@/components/Study/Congratulations";
import Header from "@/components/Study/Header";
import Audio from "@/components/Audio";
import Info from "@/components/Study/Info";
import Transcript from "@/components/Study/Transcript";
import SpeakComingSoon from "@/components/Study/SpeakComingSoon";
import { getAudioUrl, translate } from "@/lib/utils";
import useStudy from "@/hooks/useStudy";
import useReviews from "@/hooks/useReviews";

const Study = () => {
  const [isAudioComplete, setIsAudioComplete] = useState(false);
  const { isLoading, isDone, entry, error, answer, refetch } = useStudy();
  const { incrementReviews } = useReviews();

  const handleAudioComplete = () => setIsAudioComplete(true);

  const handleAnswer = (understood: boolean) => {
    answer(understood);
    setIsAudioComplete(false);
    incrementReviews();
  };

  if (isLoading) {
    return (
      <Container>
        <Loading />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Error onRefresh={refetch} />
      </Container>
    );
  }

  if (isDone) {
    return (
      <Container>
        <Congratulations />
      </Container>
    );
  }

  return (
    <Container>
      <Header />
      <Card className="w-full">
        <CardContent className="space-y-4">
          <Audio src={getAudioUrl(entry)} onComplete={handleAudioComplete} />
        </CardContent>
        <CardFooter className="flex-col space-y-4">
          <Separator />
          <Info entry={entry} />
        </CardFooter>
      </Card>
      {entry && isAudioComplete && (
        <Transcript
          onTranslate={() => translate(entry.transcript)}
          onCorrect={() => handleAnswer(true)}
          onIncorrect={() => handleAnswer(false)}
        >
          {entry.transcript}
        </Transcript>
      )}
      <SpeakComingSoon />
    </Container>
  );
};

export default Study;
