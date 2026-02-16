import Drawer from "@/components/Insights/Drawer";
import Tabs from "@/components/Insights/Tabs";
import { getDue } from "@/lib/studyUtils";
import useStudiesStorage from "@/hooks/useStudiesStorage";

const Insights = () => {
  const { studies, replace } = useStudiesStorage();

  const due = getDue(studies);

  return (
    <Drawer due={due}>
      <Tabs studies={studies} due={due} onImport={replace} />
    </Drawer>
  );
};

export default Insights;
