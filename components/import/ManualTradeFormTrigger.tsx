"use client";

// ---------------------------------------------------------------------------
// ManualTradeFormTrigger
// Thin client wrapper used by the import server page to open ManualTradeForm.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ManualTradeForm } from "@/components/import/ManualTradeForm";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManualTradeFormTriggerProps {
  userId: string;
}

export function ManualTradeFormTrigger({ userId }: ManualTradeFormTriggerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Trade
      </Button>

      <ManualTradeForm
        userId={userId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
