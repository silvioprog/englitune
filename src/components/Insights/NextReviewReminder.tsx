import { CalendarPlusIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Study } from "@/lib/types";
import { downloadICS } from "@/lib/calendarUtils";
import dayjs from "dayjs";
import { formatTimeFromNow } from "@/lib/utils";
import { getDue, getLearning } from "@/lib/studyUtils";

const NextReviewReminder = ({ studies }: { studies: Study[] }) => {
  const learning = getLearning(studies);
  const due = getDue(studies);

  const upcoming = learning
    .filter((s) => !due.includes(s))
    .sort((a, b) => dayjs(a.review).diff(b.review));

  if (upcoming.length === 0 && due.length === 0) return null;

  const nextReview = due.length > 0 ? new Date() : upcoming[0].review;

  const handleClick = () => {
    downloadICS(nextReview);
    toast.success(
      `Reminder set for ${dayjs(nextReview).format("MMM D, h:mm A")}`
    );
  };

  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-2 text-sm">
        <ClockIcon className="size-4 text-muted-foreground" />
        <span>
          {due.length > 0
            ? `${due.length} item${due.length > 1 ? "s" : ""} due now`
            : `Next review ${formatTimeFromNow(nextReview)}`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={handleClick}>
        <CalendarPlusIcon />
        <span className="hidden md:inline">Add to calendar</span>
      </Button>
    </div>
  );
};

export default NextReviewReminder;
