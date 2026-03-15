import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SetupRoleForm from "./setup-role-form";

export default function SetupRolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      }
    >
      <SetupRoleForm />
    </Suspense>
  );
}
