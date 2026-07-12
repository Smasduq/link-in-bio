from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.download import DownloadVerifyRequest
from app.services.download_verification import get_download_gate_status, verify_and_prepare_download

router = APIRouter(tags=["downloads"])


def _gate_response(token: str, db: Session) -> JSONResponse:
    payload = get_download_gate_status(db, token)
    status_code = 200 if payload.get("available") else 404
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/download/{token}")
def download_gate(token: str, db: Session = Depends(get_db)):
    """Return gate metadata for the download page — does not serve the file."""
    return _gate_response(token, db)


@router.get("/download/{token}/status")
def download_token_status(token: str, db: Session = Depends(get_db)):
    """Alias for gate status used by the frontend download page."""
    payload = get_download_gate_status(db, token)
    if not payload.get("available"):
        return {"valid": False, "message": payload.get("message", "This download link is not available.")}
    return {
        "valid": True,
        "product_title": payload["product_title"],
        "expires_at": payload.get("expires_at"),
        "requires_email": True,
    }


@router.post("/download/{token}/verify")
def verify_download(token: str, body: DownloadVerifyRequest, db: Session = Depends(get_db)):
    """Verify buyer email, apply PDF watermarking, and stream the file."""
    try:
        file_bytes, media_type, file_name = verify_and_prepare_download(db, token, str(body.email))
    except HTTPException:
        db.commit()
        raise
    db.commit()
    return StreamingResponse(
        iter([file_bytes]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
