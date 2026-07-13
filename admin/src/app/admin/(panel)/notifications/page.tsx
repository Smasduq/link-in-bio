"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils";

type CronRun = {
  id: string;
  job_name: string;
  status: string;
  details: Record<string, number>;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

export default function AdminNotificationsPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: CronRun[] }>("/api/admin/notifications/cron-runs")
      .then((data) => setRuns(data.items))
      .finally(() => setLoading(false));
  }, []);

  const handleBroadcast = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setResult("");
    try {
      const data = await apiFetch<{ message: string; data: { sent: number; total_users: number } }>(
        "/api/admin/notifications/broadcast",
        {
          method: "POST",
          body: JSON.stringify({ message, subject: subject || undefined }),
        }
      );
      setResult(`Sent to ${data.data?.sent ?? 0} of ${data.data?.total_users ?? 0} users.`);
      setMessage("");
      setSubject("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Broadcast messages and monitor engagement cron runs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast</CardTitle>
          <CardDescription>Sends an in-app notification and email to all active users via notify_user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBroadcast} className="space-y-4 max-w-xl">
            <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={3} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {result ? <p className="text-sm text-emerald-700">{result}</p> : null}
            <Button type="submit" loading={sending}>Send broadcast</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement cron runs</CardTitle>
          <CardDescription>Recent hourly engagement notification job executions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoader />
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cron runs logged yet. Runs are recorded when POST /api/cron/engagement-notifications executes.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{run.job_name}</p>
                    <Badge variant={run.status === "success" ? "success" : "destructive"}>{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(run.started_at)}
                    {run.finished_at ? ` → ${formatDateTime(run.finished_at)}` : ""}
                  </p>
                  <p className="mt-2 text-xs">
                    Morning {run.details.morning ?? 0} · Evening {run.details.evening ?? 0} · Weekly {run.details.weekly ?? 0} · Inactivity {run.details.inactivity ?? 0}
                  </p>
                  {run.error_message ? <p className="mt-2 text-xs text-destructive">{run.error_message}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
