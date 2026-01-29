import dayjs from "dayjs";
import { useLocalStorage } from "usehooks-ts";
import type { Entry, Study } from "@/lib/types";
import { createStudy, updateAll } from "@/lib/studyUtils";

type StudyKey = keyof Study;

const isReviewKey = (key: string) => (key as StudyKey) === "review";

const serializer = (studies: Study[]) =>
  JSON.stringify(studies, (key, value) =>
    isReviewKey(key) ? dayjs(value).format("YYYYMMDDHHmmss") : value
  );

const deserializer = (studies: string) =>
  JSON.parse(studies, (key, value) =>
    isReviewKey(key) ? dayjs(value).toDate() : value
  );

const useStudiesStorage = () => {
  const [studies, setStudies] = useLocalStorage<Study[]>(
    "englitune-studies",
    [],
    { serializer, deserializer }
  );

  const initialize = (entry: Entry) =>
    setStudies((prevStudies) => [...prevStudies, createStudy(entry)]);

  const save = ({ entry, understood }: { entry: Entry; understood: boolean }) =>
    setStudies((prevStudies) =>
      updateAll({ studies: prevStudies, entry, understood })
    );

  const replace = (newStudies: Study[]) => setStudies(newStudies);

  return { studies, initialize, save, replace };
};

export default useStudiesStorage;
