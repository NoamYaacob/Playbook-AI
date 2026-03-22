// ---------------------------------------------------------------------------
// File Upload API Route
//
// POST /api/upload
//
// Accepts multipart/form-data with a "file" field. Validates file size and
// MIME type, then delegates to the active storage provider.
//
// Response: { url: string; key: string }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send a multipart/form-data request with a 'file' field." },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${file.type}". Allowed types: ${[...ALLOWED_TYPES].join(", ")}.`,
        },
        { status: 415 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is too large. Maximum allowed size is 10 MB.` },
        { status: 413 },
      );
    }

    // Derive a storage key from a timestamp + original filename
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const result = await storage.upload(file, key);

    return NextResponse.json({ url: result.url, key: result.key }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during the file upload." },
      { status: 500 },
    );
  }
}
