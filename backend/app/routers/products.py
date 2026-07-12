"""Creator product CRUD and public purchase initialization."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    PublicProductResponse,
    PurchaseInitializeRequest,
    PurchaseInitializeResponse,
)
from app.services.cloudinary_storage import build_public_image_url, upload_product_cover, upload_product_file
from app.services.fee_pricing import calculate_fee_inclusive_amount
from app.services.premium_access import assert_can_create_product

router = APIRouter(prefix="/products", tags=["products"])


def _serialize_product(db: Session, product: Product) -> ProductResponse:
    stats = (
        db.query(
            func.count(ProductPurchase.id),
            func.coalesce(func.sum(ProductPurchase.amount_paid), 0),
        )
        .filter(ProductPurchase.product_id == product.id)
        .one()
    )
    pricing = calculate_fee_inclusive_amount(float(product.price))
    cover_url = None
    if product.cover_image_public_id:
        cover_url = build_public_image_url(
            product.cover_image_public_id,
            version=product.cover_image_version,
        )
    return ProductResponse(
        id=product.id,
        profile_id=product.profile_id,
        title=product.title,
        description=product.description,
        price=product.price,
        total_charge=pricing["total_charge"],
        cover_image_url=cover_url,
        file_name=product.file_name,
        is_active=product.is_active,
        sales_count=int(stats[0] or 0),
        revenue=float(stats[1] or 0),
        created_at=product.created_at,
    )


def _serialize_public_product(product: Product) -> PublicProductResponse:
    pricing = calculate_fee_inclusive_amount(float(product.price))
    cover_url = None
    if product.cover_image_public_id:
        cover_url = build_public_image_url(
            product.cover_image_public_id,
            version=product.cover_image_version,
        )
    return PublicProductResponse(
        id=product.id,
        title=product.title,
        description=product.description,
        price=product.price,
        total_charge=pricing["total_charge"],
        cover_image_url=cover_url,
        file_name=product.file_name,
    )


def _get_owned_product(db: Session, user: User, product_id: str) -> Product:
    profile = get_user_profile(user)
    product = db.query(Product).filter(Product.id == product_id, Product.profile_id == profile.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("", response_model=list[ProductResponse])
def list_products(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_user_profile(user)
    products = (
        db.query(Product)
        .filter(Product.profile_id == profile.id)
        .order_by(Product.created_at.desc())
        .all()
    )
    return [_serialize_product(db, product) for product in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_user_profile(user)
    assert_can_create_product(user, db, profile.id)
    product = Product(
        profile_id=profile.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        price=payload.price,
        file_public_id="pending",
        file_name="pending",
        is_active=False,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _serialize_product(db, product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = _get_owned_product(db, user, product_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key == "title" and isinstance(value, str):
            value = value.strip()
        if key == "description" and isinstance(value, str):
            value = value.strip() or None
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return _serialize_product(db, product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = _get_owned_product(db, user, product_id)
    db.delete(product)
    db.commit()


@router.post("/{product_id}/cover", response_model=ProductResponse)
async def upload_cover(
    product_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = _get_owned_product(db, user, product_id)
    public_id, version, _url = await upload_product_cover(product.id, file)
    product.cover_image_public_id = public_id
    product.cover_image_version = version
    db.commit()
    db.refresh(product)
    return _serialize_product(db, product)


@router.post("/{product_id}/file", response_model=ProductResponse)
async def upload_deliverable(
    product_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = _get_owned_product(db, user, product_id)
    public_id, file_name = await upload_product_file(product.id, file)
    product.file_public_id = public_id
    product.file_name = file_name
    db.commit()
    db.refresh(product)
    return _serialize_product(db, product)


@router.post("/{product_id}/purchase/initialize", response_model=PurchaseInitializeResponse)
async def initialize_purchase(
    product_id: str,
    payload: PurchaseInitializeRequest,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.file_public_id in {"", "pending"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is not ready for sale.")

    result = await initialize_product_purchase(db, product=product, buyer_email=str(payload.buyer_email))
    return PurchaseInitializeResponse(**result)
