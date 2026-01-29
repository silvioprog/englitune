import dayjs from "dayjs";
import type { Study } from "@/lib/types";

interface StudyExport {
  version: 1;
  exportedAt: string;
  studies: Study[];
}

type StudyKey = keyof Study;

const isReviewKey = (key: string) => (key as StudyKey) === "review";

export const serializeStudies = (studies: Study[]): string => {
  const data: StudyExport = {
    version: 1,
    exportedAt: dayjs().format("YYYYMMDDHHmmss"),
    studies
  };
  return JSON.stringify(data, (key, value) =>
    isReviewKey(key) ? dayjs(value).format("YYYYMMDDHHmmss") : value
  );
};

export const deserializeStudies = (json: string): Study[] => {
  const data = JSON.parse(json);
  if (!data || data.version !== 1 || !Array.isArray(data.studies)) {
    throw new Error("Invalid file format");
  }
  return data.studies.map((s: Record<string, unknown>) => {
    if (
      typeof s.step !== "number" ||
      typeof s.incorrect !== "number" ||
      !s.entry ||
      !s.review
    ) {
      throw new Error("Invalid study data");
    }
    return {
      step: s.step,
      review: dayjs(s.review as string, "YYYYMMDDHHmmss").toDate(),
      incorrect: s.incorrect,
      entry: s.entry
    };
  });
};

export const downloadStudies = (studies: Study[]) => {
  const json = serializeStudies(studies);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `englitune-backup-${dayjs().format("YYYY-MM-DD")}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const readStudiesFile = (file: File): Promise<Study[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const studies = deserializeStudies(reader.result as string);
        resolve(studies);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
