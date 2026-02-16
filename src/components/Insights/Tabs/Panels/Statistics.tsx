import type { ComponentProps } from "react";
import { BookOpenIcon, ClockIcon, TargetIcon, TrophyIcon } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import LetsStudy from "@/components/LetsStudy";
import DataActions from "@/components/Insights/DataActions";
import type { Study } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const Statistics = ({
  due,
  learning,
  mastered,
  studies,
  onImport,
  ...props
}: Omit<ComponentProps<typeof TabsContent>, "value"> & {
  due: Study[];
  learning: Study[];
  mastered: Study[];
  studies: Study[];
  onImport: (studies: Study[]) => void;
}) => {
  const stats = [
    {
      label: "Due now",
      value: due.length,
      icon: ClockIcon,
      variant: "destructive",
      description: "Items ready for review"
    },
    {
      label: "Learning",
      value: learning.length,
      icon: BookOpenIcon,
      variant: "default",
      description: "Items in progress"
    },
    {
      label: "Mastered",
      value: mastered.length,
      icon: TrophyIcon,
      variant: "secondary",
      description: "Items you've mastered"
    },
    {
      label: "Total studied",
      value: studies.length,
      icon: TargetIcon,
      variant: "outline",
      description: "All items encountered"
    }
  ] as const;

  return (
    <TabsContent value="stats" {...props}>
      {studies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No statistics yet</EmptyTitle>
            <EmptyDescription>
              Start studying to see your progress!
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <LetsStudy />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center space-y-2 border rounded-lg p-3"
              >
                <Badge
                  variant={stat.variant}
                  className="flex items-center justify-center gap-2 w-full py-3"
                >
                  <stat.icon className="size-5!" />
                  <span className="font-bold text-xl">
                    {formatNumber(stat.value)}
                  </span>
                </Badge>
                <div>
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DataActions studies={studies} onImport={onImport} />
        </div>
      )}
    </TabsContent>
  );
};

export default Statistics;
