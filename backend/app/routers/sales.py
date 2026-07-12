import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.user import User
from app.schemas.product import ProductSaleResponse

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[ProductSaleResponse])
def list_sales(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_user_profile(user)
    purchases = (
        db.query(ProductPurchase)
        .join(Product, ProductPurchase.product_id == Product.id)
        .options(joinedload(ProductPurchase.product))
        .filter(Product.profile_id == profile.id)
        .order_by(ProductPurchase.created_at.desc())
        .all()
    )
    return [
        ProductSaleResponse(
            id=purchase.id,
            product_id=purchase.product_id,
            product_title=purchase.product.title,
            buyer_email=purchase.buyer_email,
            amount_paid=purchase.amount_paid,
            paystack_reference=purchase.paystack_reference,
            download_count=purchase.download_count,
            download_flagged=purchase.download_flagged,
            created_at=purchase.created_at,
        )
        for purchase in purchases
    ]


@router.get("/export")
def export_sales_csv(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_user_profile(user)
    purchases = (
        db.query(ProductPurchase)
        .join(Product, ProductPurchase.product_id == Product.id)
        .options(joinedload(ProductPurchase.product))
        .filter(Product.profile_id == profile.id)
        .order_by(ProductPurchase.created_at.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Product", "Buyer Email", "Amount Paid (NGN)", "Reference", "Downloads"])
    for purchase in purchases:
        writer.writerow(
            [
                purchase.created_at.isoformat(),
                purchase.product.title,
                purchase.buyer_email,
                purchase.amount_paid,
                purchase.paystack_reference,
                purchase.download_count,
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="product-sales.csv"'},
    )
