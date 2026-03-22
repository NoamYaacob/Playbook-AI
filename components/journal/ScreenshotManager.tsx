"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScreenshotType, TradeScreenshotRow } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tradeId: string;
  screenshots: TradeScreenshotRow[];
  onAdd: (file: File, type: ScreenshotType, label?: string) => Promise<void>;
  onDelete: (screenshotId: string) => Promise<void>;
  onUpdateLabel: (screenshotId: string, label: string, notes?: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface TabConfig {
  type: ScreenshotType;
  label: string;
}

const TABS: TabConfig[] = [
  { type: "BEFORE_ENTRY", label: "Before Entry" },
  { type: "AFTER_EXIT", label: "After Exit" },
  { type: "MARKED_UP_CHART", label: "Marked-Up Chart" },
  { type: "BROKER_SCREENSHOT", label: "Broker Screenshot" },
  { type: "HIGHER_TIMEFRAME", label: "Higher TF" },
  { type: "OTHER", label: "Other" },
];

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".webp") ||
    lower.includes(".gif")
  );
}

// ---------------------------------------------------------------------------
// Upload zone
// ---------------------------------------------------------------------------

interface UploadZoneProps {
  type: ScreenshotType;
  typeLabel: string;
  onAdd: Props["onAdd"];
}

function UploadZone({ type, typeLabel, onAdd }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WebP, and GIF files are accepted.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 20, 90));
    }, 100);

    try {
      await onAdd(file, type);
      setProgress(100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setProgress(0);
      // Reset file input
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700",
          "bg-slate-900/30 hover:bg-slate-800/40 hover:border-indigo-500/50 transition-all duration-200",
          "py-6 px-4 text-center cursor-pointer",
          isUploading && "opacity-60 cursor-not-allowed",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            <div className="w-full max-w-[160px] h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">Uploading…</span>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Camera className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium">
                Add {typeLabel} screenshot
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                JPEG, PNG, WebP, GIF · Max {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
              <Upload className="h-3.5 w-3.5" />
              Click to upload
            </div>
          </>
        )}
      </button>
      {uploadError && (
        <p className="text-xs text-rose-400 mt-1.5">{uploadError}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thumbnail
// ---------------------------------------------------------------------------

interface ThumbnailProps {
  screenshot: TradeScreenshotRow;
  onClick: () => void;
  onDelete: () => Promise<void>;
}

function Thumbnail({ screenshot, onClick, onDelete }: ThumbnailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isImage = isImageUrl(screenshot.url);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="relative aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-700/60 group cursor-pointer"
      onClick={onClick}
    >
      {isImage ? (
        <Image
          src={screenshot.url}
          alt={screenshot.label ?? "Trade screenshot"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <FileImage className="h-8 w-8 text-slate-500" />
          <span className="text-xs text-slate-500">File</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-all duration-200 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700/80 flex items-center justify-center hover:bg-slate-600 transition-colors">
            <Pencil className="h-3.5 w-3.5 text-slate-200" />
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full bg-rose-900/80 flex items-center justify-center hover:bg-rose-800 transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 text-rose-300 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-rose-300" />
            )}
          </button>
        </div>
      </div>

      {/* Label */}
      {screenshot.label && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent px-2 py-1.5">
          <p className="text-xs text-slate-200 truncate">{screenshot.label}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  screenshots: TradeScreenshotRow[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (screenshotId: string) => Promise<void>;
  onUpdateLabel: Props["onUpdateLabel"];
}

function Lightbox({
  screenshots,
  initialIndex,
  onClose,
  onDelete,
  onUpdateLabel,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [label, setLabel] = useState(screenshots[initialIndex]?.label ?? "");
  const [notes, setNotes] = useState(screenshots[initialIndex]?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const current = screenshots[index];
  if (!current) return null;

  function prev() {
    const newIndex = (index - 1 + screenshots.length) % screenshots.length;
    setIndex(newIndex);
    setLabel(screenshots[newIndex]?.label ?? "");
    setNotes(screenshots[newIndex]?.notes ?? "");
  }

  function next() {
    const newIndex = (index + 1) % screenshots.length;
    setIndex(newIndex);
    setLabel(screenshots[newIndex]?.label ?? "");
    setNotes(screenshots[newIndex]?.notes ?? "");
  }

  async function handleSaveLabel() {
    setIsSaving(true);
    try {
      await onUpdateLabel(current.id, label, notes);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(current.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  const isImage = isImageUrl(current.url);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full bg-slate-900 border-slate-700 p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full min-h-[400px]">
          {/* Image area */}
          <div className="flex-1 relative bg-slate-950 flex items-center justify-center min-h-[300px] lg:min-h-[500px]">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4 text-slate-300" />
            </button>

            {/* Navigation */}
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-200" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-slate-200" />
                </button>
              </>
            )}

            {isImage ? (
              <div className="relative w-full h-full min-h-[300px] lg:min-h-[500px]">
                <Image
                  src={current.url}
                  alt={current.label ?? "Trade screenshot"}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <FileImage className="h-16 w-16" />
                <p className="text-sm">File preview unavailable</p>
              </div>
            )}

            {/* Counter */}
            {screenshots.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 rounded-full px-3 py-1 text-xs text-slate-300">
                {index + 1} / {screenshots.length}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-700 p-4 space-y-4 flex flex-col">
            <div className="space-y-3 flex-1">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Entry signal…"
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations about this screenshot…"
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSaveLabel}
                disabled={isSaving}
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                size="sm"
                variant="outline"
                className="w-full border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ScreenshotManager
// ---------------------------------------------------------------------------

export function ScreenshotManager({
  screenshots,
  onAdd,
  onDelete,
  onUpdateLabel,
}: Props) {
  const [activeType, setActiveType] = useState<ScreenshotType>("BEFORE_ENTRY");
  const [lightbox, setLightbox] = useState<{
    type: ScreenshotType;
    index: number;
  } | null>(null);

  const byType = (type: ScreenshotType) =>
    screenshots.filter((s) => s.screenshotType === type);

  const activeScreenshots = byType(activeType);

  const lightboxScreenshots = lightbox ? byType(lightbox.type) : [];

  return (
    <div className="space-y-4">
      {/* Tab row */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => {
          const count = byType(tab.type).length;
          const isActive = activeType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveType(tab.type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs leading-none",
                    isActive
                      ? "bg-indigo-500/30 text-indigo-300"
                      : "bg-slate-700 text-slate-400",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {activeScreenshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {activeScreenshots.map((ss, i) => (
            <Thumbnail
              key={ss.id}
              screenshot={ss}
              onClick={() => setLightbox({ type: activeType, index: i })}
              onDelete={() => onDelete(ss.id)}
            />
          ))}
        </div>
      )}

      {/* Upload zone */}
      <UploadZone
        type={activeType}
        typeLabel={TABS.find((t) => t.type === activeType)?.label ?? ""}
        onAdd={onAdd}
      />

      {/* Lightbox */}
      {lightbox && lightboxScreenshots.length > 0 && (
        <Lightbox
          screenshots={lightboxScreenshots}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onDelete={onDelete}
          onUpdateLabel={onUpdateLabel}
        />
      )}
    </div>
  );
}
