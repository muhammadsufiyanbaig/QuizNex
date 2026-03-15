import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
