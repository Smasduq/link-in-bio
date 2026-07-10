import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import ensure_db
from app.routers import analytics, auth, links, profile, public

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(title="LinkBio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(links.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.exception_handler(OperationalError)
async def database_error_handler(_request: Request, exc: OperationalError):
    logger.error("Database error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable. Check your DATABASE_URL or try again shortly."},
    )


@app.on_event("startup")
def on_startup() -> None:
    try:
        ensure_db()
        logger.info("Database ready")
    except Exception:
        logger.exception("Database init failed on startup")

    logger.info(
        "SMTP configured: host=%s port=%s user=%s from=%s password_set=%s",
        settings.smtp_host or "(missing)",
        settings.smtp_port,
        settings.smtp_user or "(missing)",
        settings.mail_from or "(missing)",
        bool(settings.smtp_password),
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
