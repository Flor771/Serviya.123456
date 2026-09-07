from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import Review, User

router = APIRouter(prefix="/reviews", tags=["Reseñas y Calificaciones"])

class CreateReviewSchema(BaseModel):
    service_id: str
    target_user_id: str
    rating: int
    comment: str

@router.post("")
def create_review(
    data: CreateReviewSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5 estrellas.")

    review = Review(
        service_id=data.service_id,
        reviewer_id=current_user.id,
        target_user_id=data.target_user_id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)

    # Recalculate average rating for target user
    all_target_reviews = db.query(Review).filter(Review.target_user_id == data.target_user_id).all()
    if all_target_reviews:
        avg_rating = sum(r.rating for r in all_target_reviews) / len(all_target_reviews)
        target_user = db.query(User).filter(User.id == data.target_user_id).first()
        if target_user:
            target_user.rating = round(avg_rating, 2)

    db.commit()
    db.refresh(review)

    return {
        "message": "Reseña guardada exitosamente",
        "review": {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment
        }
    }

@router.get("/user/{user_id}")
def get_user_reviews(user_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.target_user_id == user_id).order_by(Review.created_at.desc()).all()
    results = [
        {
            "id": r.id,
            "service_id": r.service_id,
            "reviewer_id": r.reviewer_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": str(r.created_at)
        } for r in reviews
    ]
    return {"reviews": results}
