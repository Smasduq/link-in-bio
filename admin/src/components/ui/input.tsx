"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-2">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-2">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-y",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
