export default function ProfileLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 py-12">
      <div className="w-full max-w-[480px] animate-pulse space-y-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-white/10" />
        <div className="mx-auto h-5 w-32 rounded-lg bg-white/10" />
        <div className="mx-auto h-4 w-48 rounded-lg bg-white/10" />
        <div className="mt-8 space-y-3">
          <div className="h-14 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}
