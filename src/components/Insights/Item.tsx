import type { ComponentProps } from "react";
import { ClockIcon, XIcon } from "lucide-react";
import CalendarButton from "@/components/Insights/CalendarButton";
import {
  Item as ItemComponent,
  ItemContent,
  ItemDescription,
  ItemFooter
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import type { Study } from "@/lib/types";
import { formatTimeFromNow } from "@/lib/utils";
import { isMastered } from "@/lib/studyUtils";

const Item = ({
  study,
  ...props
}: ComponentProps<typeof ItemComponent> & { study: Study }) => (
  <ItemComponent variant="outline" size="sm" role="listitem" {...props}>
    <ItemContent>
      <ItemDescription className="line-clamp-none text-pretty italic">
        "{study.entry.transcript}"
      </ItemDescription>
    </ItemContent>
    <ItemFooter className="justify-start">
      <Badge variant="outline">
        <ClockIcon />
        <span>{isMastered(study) ? "Mastered" : "Due"}</span>
        <span>{formatTimeFromNow(study.review)}</span>
      </Badge>
      {study.incorrect > 0 && (
        <Badge variant="destructive">
          <XIcon />
          <span>Incorrect:</span>
          <span>{study.incorrect}</span>
        </Badge>
      )}
      {!isMastered(study) && <CalendarButton reviewDate={study.review} />}
    </ItemFooter>
  </ItemComponent>
);

export default Item;
