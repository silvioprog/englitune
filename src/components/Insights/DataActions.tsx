import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Study } from "@/lib/types";
import { downloadStudies, readStudiesFile } from "@/lib/studyDataUtils";
import { formatNumber } from "@/lib/utils";

const DataActions = ({
  studies,
  onImport
}: {
  studies: Study[];
  onImport: (studies: Study[]) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Study[] | null>(null);

  const handleExport = () => {
    if (studies.length === 0) {
      toast.error("No study data to export");
      return;
    }
    downloadStudies(studies);
    toast.success(`Exported ${formatNumber(studies.length)} studies`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readStudiesFile(file);
      setPendingImport(imported);
    } catch {
      toast.error("Invalid backup file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = () => {
    if (pendingImport) {
      onImport(pendingImport);
      toast.success(`Imported ${formatNumber(pendingImport.length)} studies`);
      setPendingImport(null);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleExport}
        >
          <DownloadIcon />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import study data</DialogTitle>
            <DialogDescription>
              This will replace your current study progress.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangleIcon />
            <AlertTitle>Replace existing data</AlertTitle>
            <AlertDescription>
              Importing will replace your current {formatNumber(studies.length)}{" "}
              studies with {formatNumber(pendingImport?.length ?? 0)} studies
              from the backup file.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button onClick={confirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataActions;
