import type { ComponentProps } from "react";
import { Tabs as TabsComponent } from "@/components/ui/tabs";
import Titles from "@/components/Insights/Tabs/Titles";
import Panels from "@/components/Insights/Tabs/Panels";
import type { Study } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getLearning, getMastered } from "@/lib/studyUtils";

const Tabs = ({
  studies,
  due,
  onImport,
  className,
  ...props
}: ComponentProps<typeof TabsComponent> & {
  studies: Study[];
  due: Study[];
  onImport: (studies: Study[]) => void;
}) => {
  const learning = getLearning(studies);
  const mastered = getMastered(studies);

  return (
    <TabsComponent
      defaultValue="stats"
      className={cn("flex flex-col flex-1 gap-4 w-full min-h-0", className)}
      {...props}
    >
      <Titles due={due} learning={learning} mastered={mastered} />
      <Panels
        studies={studies}
        due={due}
        learning={learning}
        mastered={mastered}
        onImport={onImport}
      />
    </TabsComponent>
  );
};

export default Tabs;
