"use client";

import React, { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { cn } from "@/lib/utils";

// Local type mirroring Prisma Strategy model
type StrategyRecord = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  markets: string[];
  setupTypes: string[];
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaybookListProps {
  strategies: StrategyRecord[];
  userId: string;
}

type FilterStatus = "all" | "active" | "inactive" | "archived";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaybookList({ strategies, userId }: PlaybookListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Archived", value: "archived" },
  ];

  const filtered = strategies.filter((s) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q) ?? false;
      const matchSetups = s.setupTypes.some((st: string) => st.toLowerCase().includes(q));
      const matchMarkets = s.markets.some((m: string) => m.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchSetups && !matchMarkets) return false;
    }

    // Status filter
    if (statusFilter === "active") return s.isActive && !s.isArchived;
    if (statusFilter === "inactive") return !s.isActive && !s.isArchived;
    if (statusFilter === "archived") return s.isArchived;
    return true;
  });

  const hasFilters = search.trim() !== "" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search strategies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 pl-9 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                statusFilter === value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            {search.trim() && (
              <> for &ldquo;<span className="text-slate-300">{search}</span>&rdquo;</>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="h-7 text-xs text-slate-500 hover:text-slate-300"
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((strategy) => (
            <PlaybookCard
              key={strategy.id}
              strategy={strategy}
              userId={userId}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-16 text-center">
          <SlidersHorizontal className="mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No strategies found</p>
          <p className="mt-1 text-xs text-slate-600">
            {hasFilters ? "Try adjusting your search or filters." : "Create a new strategy to get started."}
          </p>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 border-slate-700 bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
