from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/reviews", tags=["Reseñas y Calificaciones"])

class CreateReviewSchema(BaseModel):
    service_id: str
    target_user_id: str
    rating: int
    comment: str = ""

@router.post("")
def create_review(data: CreateReviewSchema, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5 estrellas.")
    service = db.execute(text("SELECT id, client_id, worker_id, status FROM services WHERE id=:sid"), {"sid": data.service_id}).mappings().first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if service["status"] != "COMPLETADA":
        raise HTTPException(status_code=400, detail="Solo se puede calificar un servicio completado")
    if current_user.id not in {service["client_id"], service["worker_id"]}:
        raise HTTPException(status_code=403, detail="No participaste en este servicio")
    expected_target = service["worker_id"] if current_user.id == service["client_id"] else service["client_id"]
    if data.target_user_id != expected_target:
        raise HTTPException(status_code=403, detail="Solo puedes calificar a la otra parte del servicio")
    duplicate = db.execute(text("SELECT id FROM reviews WHERE service_id=:sid AND reviewer_id=:reviewer LIMIT 1"), {"sid": data.service_id, "reviewer": current_user.id}).scalar()
    if duplicate:
        raise HTTPException(status_code=409, detail="Ya calificaste este servicio")
    review_id = db.execute(text("""
        INSERT INTO reviews (contract_id, service_id, reviewer_id, reviewee_id, target_user_id, rating, comment, created_at)
        VALUES (NULL, :sid, :reviewer, :target, :target, :rating, :comment, :created_at) RETURNING id
    """), {"sid": data.service_id, "reviewer": current_user.id, "target": data.target_user_id, "rating": data.rating, "comment": data.comment, "created_at": datetime.utcnow()}).scalar_one()
    avg, count = db.execute(text("""
        SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM reviews
        WHERE reviewee_id=:uid OR target_user_id=:uid
    """), {"uid": data.target_user_id}).one()
    db.execute(text("UPDATE users SET rating=:rating WHERE id=:uid"), {"rating": round(float(avg), 2), "uid": data.target_user_id})
    db.execute(text("""
        UPDATE worker_profiles SET rating=:rating, review_count=:count
        WHERE user_id=:uid
    """), {"rating": round(float(avg), 2), "count": int(count), "uid": data.target_user_id})
    db.commit()
    return {"message": "Reseña guardada exitosamente", "review": {"id": review_id, "rating": data.rating, "comment": data.comment}, "target_rating": round(float(avg), 2), "review_count": int(count)}

@router.get("/user/{user_id}")
def get_user_reviews(user_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, service_id, reviewer_id, reviewee_id, target_user_id, rating, comment, created_at
        FROM reviews WHERE reviewee_id=:uid OR target_user_id=:uid ORDER BY created_at DESC
    """), {"uid": user_id}).mappings().all()
    return {"reviews": [{"id": r["id"], "service_id": r["service_id"], "reviewer_id": r["reviewer_id"], "rating": r["rating"], "comment": r["comment"], "created_at": str(r["created_at"])} for r in rows]}
