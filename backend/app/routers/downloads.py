from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.product_purchases import issue_signed_download, verify_download_token

router = APIRouter(tags=["downloads"])


@router.get("/download/{token}")
def download_product_file(token: str, db: Session = Depends(get_db)):
    """Validate download token and redirect to a short-lived signed Cloudinary URL."""
    signed_url = issue_signed_download(db, token)
    db.commit()
    return RedirectResponse(url=signed_url, status_code=302)


@router.get("/download/{token}/status")
def download_token_status(token: str, db: Session = Depends(get_db)):
    """Return token validity for the frontend error page without issuing a file URL."""
    try:
        purchase, product, creator = verify_download_token(db, token)
    except HTTPException as exc:
        if exc.status_code == 410 and isinstance(exc.detail, dict):
            return {"valid": False, **exc.detail}
        raise
    return {
        "valid": True,
        "product_title": product.title,
        "expires_at": purchase.download_token_expires_at,
        "creator_email": creator.email if creator else None,
    }
