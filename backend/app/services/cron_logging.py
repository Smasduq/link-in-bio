"""Record cron job executions for admin visibility."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.cron_run import CronRun


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def start_cron_run(db: Session, job_name: str) -> CronRun:
    run = CronRun(job_name=job_name, status="running", details={})
    db.add(run)
    db.flush()
    return run


def finish_cron_run(db: Session, run: CronRun, *, details: dict[str, Any], error: str | None = None) -> CronRun:
    run.status = "failed" if error else "success"
    run.details = details
    run.error_message = error
    run.finished_at = _utcnow()
    db.add(run)
    return run


def list_cron_runs(db: Session, *, job_name: str | None = None, limit: int = 20) -> list[CronRun]:
    query = db.query(CronRun)
    if job_name:
        query = query.filter(CronRun.job_name == job_name)
    return query.order_by(CronRun.started_at.desc()).limit(limit).all()
