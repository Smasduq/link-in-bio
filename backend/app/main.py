import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.config import SITE_NAME, settings
from app.database import ensure_db, SessionLocal
from app.routers import analytics, auth, billing, dev, downloads, links, notifications, products, profile, public, push, sales, social_links, subscribers, users
from app.services.geoip import close_geoip, init_geoip, resolve_geolite2_db_path
from app.services.plan_catalog import ensure_billing_plans

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        ensure_db()
        logger.info("Database ready")
        db = SessionLocal()
        try:
            await ensure_billing_plans(db)
            logger.info("Billing plans synced")
        finally:
            db.close()
    except Exception:
        logger.exception("Database init failed on startup")

    init_geoip()
    logger.info("GeoLite2 database path: %s", resolve_geolite2_db_path())

    logger.info(
        "Email configured: brevo=%s sender=%s dev_routes=%s",
        bool(settings.brevo_api_key),
        "hello@smasduq.xyz",
        settings.dev_routes_enabled,
    )

    yield

    close_geoip()


app = FastAPI(title=f"{SITE_NAME} API", version="1.0.0", lifespan=lifespan)

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
app.include_router(social_links.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(push.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(subscribers.router, prefix="/api")

if settings.dev_routes_enabled:
    app.include_router(dev.router, prefix="/api")


@app.exception_handler(OperationalError)
async def database_error_handler(_request: Request, exc: OperationalError):
    logger.error("Database error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable. Check your DATABASE_URL or try again shortly."},
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
