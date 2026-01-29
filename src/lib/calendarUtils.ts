import dayjs from "dayjs";

export interface CalendarEvent {
  title: string;
  description: string;
  url: string;
  start: Date;
  durationMinutes: number;
}

const APP_URL = "https://englitune.silvioprog.dev";

export const formatICSDate = (date: Date): string =>
  dayjs(date).format("YYYYMMDDTHHmmss");

const generateUID = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}@englitune`;

export const escapeICS = (text: string): string =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

export const createReviewEvent = (reviewDate: Date): CalendarEvent => ({
  title: "Englitune - Review your English lessons",
  description: `Time to review your English lessons with spaced repetition!\n\n${APP_URL}`,
  url: APP_URL,
  start: reviewDate,
  durationMinutes: 15
});

export const generateICS = (event: CalendarEvent): string => {
  const end = dayjs(event.start).add(event.durationMinutes, "minute").toDate();

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Englitune//Review Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `URL:${event.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
};

export const downloadICS = (reviewDate: Date) => {
  const event = createReviewEvent(reviewDate);
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `englitune-review-${dayjs(reviewDate).format("YYYY-MM-DD")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};
