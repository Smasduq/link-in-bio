"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { apiUploadFile } from "@/lib/api-upload";
import { ApiError } from "@/lib/api";
import { hasCustomAvatar, resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type AvatarUploadProps = {
  avatarUrl: string | null;
  avatarPublicId?: string | null;
  onUploaded: (payload: { avatarUrl: string; avatarPublicId: string }) => void;
  className?: string;
};

export function AvatarUpload({ avatarUrl, avatarPublicId, onUploaded, className }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayUrl = previewUrl || resolveAvatarUrl(avatarUrl);

  const handlePick = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return nextPreview;
    });

    setUploading(true);
    try {
      const result = await apiUploadFile<{ avatar_url: string; avatar_public_id: string }>(
        "/api/users/me/avatar",
        file
      );
      onUploaded({ avatarUrl: result.avatar_url, avatarPublicId: result.avatar_public_id });
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setError(err instanceof ApiError ? err.message : "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-emerald-50 ring-emerald-600/20 transition hover:ring-2 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-950/50"
          aria-label="Upload profile photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100 group-disabled:opacity-100">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
        </button>

        <div className="space-y-1">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP up to 5MB. Cloudinary optimizes delivery automatically.
          </p>
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-60 dark:text-emerald-400"
          >
            {uploading ? "Uploading…" : hasCustomAvatar(avatarPublicId) ? "Change photo" : "Upload photo"}
          </button>
        </div>
      </div>

      {!hasCustomAvatar(avatarPublicId) && !previewUrl ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>Using the default avatar until you upload one.</span>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
