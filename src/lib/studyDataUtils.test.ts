import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import type { Entry, Study } from "./types";
import { serializeStudies, deserializeStudies } from "./studyDataUtils";

const makeEntry = ({
  sequence,
  speaker = "alice"
}: {
  sequence: string;
  speaker?: string;
}): Entry => ({
  transcript: `Sentence ${sequence}`,
  sequence,
  speaker,
  age: 30,
  gender: "female",
  accent: "US"
});

const makeStudy = ({
  step = 1,
  review = new Date("2025-01-15T10:30:00"),
  incorrect = 0,
  sequence = "001"
}: Partial<Study & { sequence: string }> = {}): Study => ({
  step,
  review,
  incorrect,
  entry: makeEntry({ sequence })
});

describe("serializeStudies", () => {
  it("produces valid JSON with version and exportedAt", () => {
    const studies = [makeStudy()];
    const json = serializeStudies(studies);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toMatch(/^\d{14}$/);
    expect(parsed.studies).toHaveLength(1);
  });

  it("serializes review dates as YYYYMMDDHHmmss strings", () => {
    const studies = [makeStudy({ review: new Date("2025-06-15T08:30:00") })];
    const json = serializeStudies(studies);
    const parsed = JSON.parse(json);

    expect(parsed.studies[0].review).toMatch(/^\d{14}$/);
  });

  it("handles empty studies array", () => {
    const json = serializeStudies([]);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.studies).toHaveLength(0);
  });
});

describe("deserializeStudies", () => {
  it("correctly parses valid data", () => {
    const original = [makeStudy({ step: 3, incorrect: 2, sequence: "005" })];
    const json = serializeStudies(original);
    const result = deserializeStudies(json);

    expect(result).toHaveLength(1);
    expect(result[0].step).toBe(3);
    expect(result[0].incorrect).toBe(2);
    expect(result[0].entry.sequence).toBe("005");
    expect(result[0].review).toBeInstanceOf(Date);
  });

  it("throws on missing version", () => {
    const json = JSON.stringify({ studies: [] });
    expect(() => deserializeStudies(json)).toThrow("Invalid file format");
  });

  it("throws on wrong version", () => {
    const json = JSON.stringify({ version: 2, studies: [] });
    expect(() => deserializeStudies(json)).toThrow("Invalid file format");
  });

  it("throws on non-array studies", () => {
    const json = JSON.stringify({ version: 1, studies: "not-array" });
    expect(() => deserializeStudies(json)).toThrow("Invalid file format");
  });

  it("throws on invalid study fields", () => {
    const json = JSON.stringify({
      version: 1,
      studies: [
        {
          step: "not-number",
          incorrect: 0,
          review: "20250115103000",
          entry: {}
        }
      ]
    });
    expect(() => deserializeStudies(json)).toThrow("Invalid study data");
  });

  it("throws on missing entry", () => {
    const json = JSON.stringify({
      version: 1,
      studies: [{ step: 1, incorrect: 0, review: "20250115103000" }]
    });
    expect(() => deserializeStudies(json)).toThrow("Invalid study data");
  });

  it("throws on missing review", () => {
    const json = JSON.stringify({
      version: 1,
      studies: [{ step: 1, incorrect: 0, entry: {} }]
    });
    expect(() => deserializeStudies(json)).toThrow("Invalid study data");
  });

  it("throws on invalid JSON", () => {
    expect(() => deserializeStudies("not json")).toThrow();
  });
});

describe("round-trip", () => {
  it("serialize then deserialize produces equivalent data", () => {
    const original = [
      makeStudy({ step: 1, incorrect: 0, sequence: "001" }),
      makeStudy({ step: 5, incorrect: 3, sequence: "042" })
    ];
    const json = serializeStudies(original);
    const result = deserializeStudies(json);

    expect(result).toHaveLength(2);
    result.forEach((study, i) => {
      expect(study.step).toBe(original[i].step);
      expect(study.incorrect).toBe(original[i].incorrect);
      expect(study.entry.sequence).toBe(original[i].entry.sequence);
      expect(study.entry.speaker).toBe(original[i].entry.speaker);
      expect(study.entry.transcript).toBe(original[i].entry.transcript);
      expect(dayjs(study.review).format("YYYYMMDDHHmmss")).toBe(
        dayjs(original[i].review).format("YYYYMMDDHHmmss")
      );
    });
  });
});
