import { CalendarPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadICS } from "@/lib/calendarUtils";
import dayjs from "dayjs";

const CalendarButton = ({ reviewDate }: { reviewDate: Date }) => {
  const handleClick = () => {
    downloadICS(reviewDate);
    toast.success(
      `Reminder set for ${dayjs(reviewDate).format("MMM D, h:mm A")}`
    );
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-7"
      title="Add review reminder to calendar"
      aria-label="Add review reminder to calendar"
      onClick={handleClick}
    >
      <CalendarPlusIcon className="size-3.5" />
    </Button>
  );
};

export default CalendarButton;
