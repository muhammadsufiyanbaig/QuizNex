import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Setup2FAForm from "./setup-2fa-form";

export default function Setup2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      }
    >
      <Setup2FAForm />
    </Suspense>
  );
}
