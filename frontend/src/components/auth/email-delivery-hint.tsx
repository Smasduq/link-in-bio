export function EmailDeliveryHint({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-xs text-muted-foreground"}>
      Don&apos;t see the email? Check your spam or junk folder.
    </p>
  );
}
