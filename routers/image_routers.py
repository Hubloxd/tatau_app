import logging
from services.storage_backend import delete_stored_file, store_uploaded_file
from services.image_service import (
    add_image,
    delete_image,
    get_image,
    get_user_images,
    get_user_saved_images,
    get_feed_images,
    get_feed_counts_for_images,
)
from services.user_service import get_user
from database import get_db_session
from fastapi import File, UploadFile
from fastapi.responses import JSONResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import shutil
import uuid

logger = logging.getLogger(__name__)

_ALLOWED_IMAGE_MIME = frozenset({
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
})

_ALLOWED_VIDEO_MIME = frozenset({
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
})

_ALLOWED_UPLOAD_MIME = _ALLOWED_IMAGE_MIME | _ALLOWED_VIDEO_MIME


def _normalized_mime(content_type: str | None) -> str | None:
    if not content_type:
        return None
    return content_type.split(";", 1)[0].strip().lower()


router = APIRouter(prefix="/image", tags=["image"])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: int = 1, description: str = None, db: Session = Depends(get_db_session)):
    try:
        mime = _normalized_mime(file.content_type)
        if mime not in _ALLOWED_UPLOAD_MIME:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG, WebP, GIF, MP4, WebM, MOV, Ogg Video.",
                },
            )

        temp_filename = f"temp_{uuid.uuid4().hex}_{file.filename}"

        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        public_url = store_uploaded_file(temp_filename, file.filename or "upload")

        os.remove(temp_filename)
     
        add_image(db, user_id, public_url, description, mime_type=mime)
        
        return JSONResponse(content={"status": "success", "public_url": public_url})

    except Exception as e:
        logger.exception("upload_file failed")
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.delete("/delete/{image_id}")
async def delete_file(image_id: int, db: Session = Depends(get_db_session)):
    image = get_image(db, image_id)
    if not image:
        return JSONResponse(status_code=404, content={"error": "Image not found"})
    else:
        try:
            delete_stored_file(image.image_url)
            delete_image(db, image_id)
            return JSONResponse(content={"status": "success", "message": "Image deleted successfully"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
        

def _can_view_user_gallery(
    db: Session, profile_user_id: int, viewer_id: int | None
) -> bool:
    """Właściciel lub profil publiczny; bez viewer_id prywatna galeria niewidoczna."""
    profile_user = get_user(db, profile_user_id)
    if not profile_user:
        return False
    if viewer_id is not None and viewer_id == profile_user_id:
        return True
    return getattr(profile_user, "profile_public", True)


@router.get("/images/{user_id}")
async def get_images(
    user_id: int,
    viewer_id: int | None = None,
    db: Session = Depends(get_db_session),
):
    """
    Fetch all images for a specific user to display them on the page.
    Dla profilu prywatnego zwraca pustą listę i gallery_hidden (poza właścicielem).
    """
    try:
        if not get_user(db, user_id):
            return JSONResponse(status_code=404, content={"error": "User not found"})

        if not _can_view_user_gallery(db, user_id, viewer_id):
            return JSONResponse(
                content={
                    "status": "success",
                    "images": [],
                    "gallery_hidden": True,
                }
            )

        images = get_user_images(db, user_id)
        if not images:
            return JSONResponse(content={"status": "success", "images": []})

        image_list = [
            {
                "id": image.id,
                "url": image.image_url,
                "description": image.description,
                "mime_type": getattr(image, "mime_type", None),
            }
            for image in images
        ]

        return JSONResponse(content={"status": "success", "images": image_list})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/saved/{user_id}")
async def get_saved_images(user_id: int, db: Session = Depends(get_db_session)):
    """Zdjęcia zapisane przez użytkownika (Ulubione)."""
    try:
        images = get_user_saved_images(db, user_id)
        image_list = [
            {
                "id": image.id,
                "url": image.image_url,
                "description": image.description,
                "user_id": image.user_id,
                "username": getattr(image.owner, "username", f"User {image.user_id}"),
                "user_type": getattr(image.owner, "user_type", "artist"),
                "mime_type": getattr(image, "mime_type", None),
            }
            for image in images
        ]
        return JSONResponse(content={"status": "success", "images": image_list})
    except Exception as e:
        logger.exception("get_saved_images failed")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/image/{image_id}")
async def get_single_image(image_id: int, db: Session = Depends(get_db_session)):
    """
    Fetch a specific image by its ID
    """
    try:
        image = get_image(db, image_id)
        if not image:
            return JSONResponse(status_code=404, content={"error": "Image not found"})
        
        owner = image.owner
        image_data = {
            "id": image.id,
            "url": image.image_url,
            "description": image.description,
            "user_id": image.user_id,
            "username": getattr(owner, "username", None) if owner else None,
            "user_type": getattr(owner, "user_type", None) if owner else None,
            "avatar_url": getattr(owner, "avatar_url", None) if owner else None,
            "mime_type": getattr(image, "mime_type", None),
        }

        return JSONResponse(content={"status": "success", "image": image_data})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.get("/feed")
async def get_feed(
    limit: int = 20,
    offset: int = 0,
    user_id: int | None = None,
    search_term: str | None = None,
    db: Session = Depends(get_db_session)
):
    """Get images for the feed (data dodania — najnowsze na górze), opcjonalnie wyszukiwanie."""
    images = get_feed_images(db, limit, offset, search_term)

    image_ids = [img.id for img in images]
    comment_map, like_map, liked_ids = get_feed_counts_for_images(
        db, image_ids, user_id
    )

    image_list = [
        {
            "id": image.id,
            "url": image.image_url,
            "description": image.description,
            "user_id": image.user_id,
            "username": getattr(image.owner, "username", f"User {image.user_id}"),
            "user_type": getattr(image.owner, "user_type", "artist"),
            "avatar_url": getattr(image.owner, "avatar_url", None),
            "likes_count": like_map.get(image.id, 0),
            "comments_count": comment_map.get(image.id, 0),
            "user_liked": image.id in liked_ids if user_id else False,
            "mime_type": getattr(image, "mime_type", None),
        }
        for image in images
    ]

    return JSONResponse(content={
        "status": "success",
        "images": image_list,
        "count": len(image_list)
    })