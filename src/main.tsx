import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/Theme/Provider";
import Welcome from "@/components/Welcome";
import App from "@/components/App";
import QueryProvider from "@/lib/queryProvider";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <Welcome>
          <App />
        </Welcome>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
);
