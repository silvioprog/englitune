import { describe, it, expect } from "vitest";
import {
  createReviewEvent,
  generateICS,
  formatICSDate,
  escapeICS
} from "@/lib/calendarUtils";

describe("calendarUtils", () => {
  const reviewDate = new Date("2025-06-15T14:30:00");

  describe("formatICSDate", () => {
    it("formats date as YYYYMMDDTHHmmss", () => {
      expect(formatICSDate(reviewDate)).toBe("20250615T143000");
    });
  });

  describe("escapeICS", () => {
    it("escapes backslashes", () => {
      expect(escapeICS("test\\value")).toBe("test\\\\value");
    });

    it("escapes semicolons", () => {
      expect(escapeICS("test;value")).toBe("test\\;value");
    });

    it("escapes commas", () => {
      expect(escapeICS("test,value")).toBe("test\\,value");
    });

    it("escapes newlines", () => {
      expect(escapeICS("test\nvalue")).toBe("test\\nvalue");
    });

    it("escapes multiple special characters", () => {
      expect(escapeICS("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
    });
  });

  describe("createReviewEvent", () => {
    it("returns correct structure", () => {
      const event = createReviewEvent(reviewDate);

      expect(event.title).toBe("Englitune - Review your English lessons");
      expect(event.description).toContain(
        "Time to review your English lessons with spaced repetition!"
      );
      expect(event.description).toContain("https://englitune.silvioprog.dev");
      expect(event.url).toBe("https://englitune.silvioprog.dev");
      expect(event.start).toBe(reviewDate);
      expect(event.durationMinutes).toBe(15);
    });
  });

  describe("generateICS", () => {
    const event = createReviewEvent(reviewDate);
    const ics = generateICS(event);

    it("starts with BEGIN:VCALENDAR", () => {
      expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    });

    it("ends with END:VCALENDAR", () => {
      expect(ics).toMatch(/END:VCALENDAR$/);
    });

    it("contains VEVENT block", () => {
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("END:VEVENT");
    });

    it("contains VALARM block", () => {
      expect(ics).toContain("BEGIN:VALARM");
      expect(ics).toContain("TRIGGER:-PT5M");
      expect(ics).toContain("ACTION:DISPLAY");
      expect(ics).toContain("END:VALARM");
    });

    it("contains correct DTSTART", () => {
      expect(ics).toContain("DTSTART:20250615T143000");
    });

    it("contains correct DTEND (15 minutes later)", () => {
      expect(ics).toContain("DTEND:20250615T144500");
    });

    it("contains VERSION and PRODID", () => {
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//Englitune//Review Reminder//EN");
    });

    it("contains SUMMARY with escaped title", () => {
      expect(ics).toContain("SUMMARY:Englitune - Review your English lessons");
    });

    it("contains URL", () => {
      expect(ics).toContain("URL:https://englitune.silvioprog.dev");
    });

    it("uses CRLF line endings", () => {
      expect(ics).toContain("\r\n");
      const lines = ics.split("\r\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("contains UID with @englitune suffix", () => {
      expect(ics).toMatch(/UID:.*@englitune/);
    });
  });
});
