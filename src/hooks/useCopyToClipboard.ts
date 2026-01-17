import { useEffect, useState } from "react";
import { useCopyToClipboard as useCopyToClipboardHook } from "usehooks-ts";

type CopyToClipboardState = "idle" | "copied" | "error";

const useCopyToClipboard = ({
  idleTimeout = 1000
}: { idleTimeout?: number } = {}) => {
  const [state, setState] = useState<CopyToClipboardState>("idle");
  const [, copyToClipboard] = useCopyToClipboardHook();

  const copy = async (text: string) =>
    setState((await copyToClipboard(text)) ? "copied" : "error");

  useEffect(() => {
    if (state !== "idle") {
      const timeout = setTimeout(() => setState("idle"), idleTimeout);

      return () => clearTimeout(timeout);
    }
  }, [state, idleTimeout]);

  return { state, copy };
};

export default useCopyToClipboard;
