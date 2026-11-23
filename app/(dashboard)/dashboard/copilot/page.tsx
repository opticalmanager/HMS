import { Suspense } from "react";
import { CopilotWorkspace } from "@/components/copilot/CopilotWorkspace";

export const metadata = {
  title: "Doctor AI Copilot | Apex Clinical Monolith",
  description: "Native voice dictation, HITL draft prescriptions & billing, streaming clinical chat",
};

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-8 text-slate-500 text-xs">
          Loading Doctor AI Copilot Workspace...
        </div>
      }
    >
      <CopilotWorkspace />
    </Suspense>
  );
}
