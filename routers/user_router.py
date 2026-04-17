import os
import shutil
import traceback
import uuid

from services.storage_backend import store_uploaded_file
from services.user_service import (
    add_user,
    delete_user,
    get_user,
    authenticate_user,
    search_users_by_term,
    add_follow,
    remove_follow,
    is_following,
    update_user_profile,
    update_user_password,
    set_user_avatar_url,
)
from database import get_db_session
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

router = APIRouter(prefix="/user", tags=["user"])


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserSettingsUpdate(BaseModel):
    email: EmailStr | None = None
    bio: str | None = None
    profile_public: bool | None = None


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


def _user_public_dict(user):
    """Pełne dane (logowanie / właściciel)."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "user_type": user.user_type,
        "bio": getattr(user, "bio", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "profile_public": getattr(user, "profile_public", True),
    }


def _user_profile_for_viewer(user, viewer_id: int | None):
    """
    Widok profilu dla obserwatora. Bez e-maila dla obcych; bio ukryte przy profilu prywatnym
    (chyba że viewer to właściciel).
    """
    is_self = viewer_id is not None and viewer_id == user.id
    public = getattr(user, "profile_public", True)
    out = {
        "id": user.id,
        "username": user.username,
        "user_type": user.user_type,
        "avatar_url": getattr(user, "avatar_url", None),
        "profile_public": public,
    }
    if is_self:
        out["email"] = user.email
        out["bio"] = getattr(user, "bio", None)
        return out
    if public:
        out["bio"] = getattr(user, "bio", None)
    else:
        out["bio"] = None
        out["profile_limited"] = True
    return out

@router.post("/register_user")
async def register_user(username: str, email: str, password: str, user_type: str, db: Session = Depends(get_db_session)):
    try:
        user = add_user(db, username, email, password, user_type)
        return JSONResponse(content={"status": "success", "user_id": user.id})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.delete("/delete_user/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        user = get_user(db, user_id)
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})
        else:   
            delete_user(db, user_id)       
            return JSONResponse(content={"status": "success", "message": "User deleted successfully"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/login_user/")
async def login_user(login_data: LoginRequest, db: Session = Depends(get_db_session)):
    """
    Authenticate a user and return user information if successful
    """
    try:
        user = authenticate_user(db, login_data.username_or_email, login_data.password)
        
        if user:
            return JSONResponse(
                content={
                    "status": "success",
                    "user": _user_public_dict(user),
                }
            )
        else:
            return JSONResponse(
                status_code=401,
                content={"status": "error", "message": "Nieprawidłowa nazwa użytkownika/email lub hasło"}
            )
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Logowanie nie powiodło się: {str(e)}"}
        )

@router.get("/search")
async def search_users(term: str = "", db: Session = Depends(get_db_session)):
    try:
        users = search_users_by_term(db, term)
        if not users:
            return JSONResponse(content={"status": "success", "users": []})
        
        user_list = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "user_type": user.user_type
            }
            for user in users
        ]
        
        return JSONResponse(content={"status": "success", "users": user_list})
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"status": "error", "message": f"Search failed: {str(e)}"}
        )

@router.get("/user/{user_id}")
async def get_user_details(user_id: int, follower_id: int | None = None, db: Session = Depends(get_db_session)):
    try:
        user = get_user(db, user_id)
        if not user:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "User not found"}
            )

        follow_state = False
        if follower_id:
            follow_state = is_following(db, follower_id, user_id)

        u = _user_profile_for_viewer(user, follower_id)
        u["is_following"] = follow_state
        return JSONResponse(content={"status": "success", "user": u})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to get user: {str(e)}"}
        )

@router.put("/update_follow/{user_id}/{followed_id}")
async def update_follow(
    user_id: int,
    followed_id: int,
    action: str = "follow",
    db: Session = Depends(get_db_session)
):
    try:
        if user_id == followed_id:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Users cannot follow themselves"}
            )
        follower = get_user(db, user_id)
        target = get_user(db, followed_id)
        if not follower or not target:
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})

        if action == "unfollow":
            remove_follow(db, user_id, followed_id)
            is_now_following = False
            msg = "Unfollowed successfully"
        else:
            add_follow(db, user_id, followed_id)
            is_now_following = True
            msg = "Followed successfully"

        return JSONResponse(content={"status": "success", "message": msg, "is_following": is_now_following})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to follow user: {str(e)}"}
        )


@router.get("/settings/{user_id}")
async def get_user_settings(user_id: int, db: Session = Depends(get_db_session)):
    try:
        user = get_user(db, user_id)
        if not user:
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})
        return JSONResponse(content={"status": "success", "user": _user_public_dict(user)})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.put("/settings/{user_id}")
async def put_user_settings(
    user_id: int,
    body: UserSettingsUpdate,
    db: Session = Depends(get_db_session),
):
    try:
        if not get_user(db, user_id):
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})
        update_user_profile(
            db,
            user_id,
            email=body.email,
            bio=body.bio,
            profile_public=body.profile_public,
        )
        user = get_user(db, user_id)
        return JSONResponse(content={"status": "success", "user": _user_public_dict(user)})
    except ValueError as e:
        if str(e) == "email_taken":
            return JSONResponse(
                status_code=409,
                content={"status": "error", "message": "Ten adres e-mail jest już zajęty."},
            )
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/change_password/{user_id}")
async def change_password(
    user_id: int,
    body: PasswordChangeRequest,
    db: Session = Depends(get_db_session),
):
    try:
        if not get_user(db, user_id):
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})
        ok = update_user_password(db, user_id, body.old_password, body.new_password)
        if not ok:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Obecne hasło jest nieprawidłowe."},
            )
        return JSONResponse(content={"status": "success"})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/avatar/{user_id}")
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
):
    try:
        if not get_user(db, user_id):
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})
        temp_filename = f"temp_{uuid.uuid4().hex}_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        public_url = store_uploaded_file(temp_filename, file.filename or "avatar")
        os.remove(temp_filename)
        set_user_avatar_url(db, user_id, public_url)
        user = get_user(db, user_id)
        return JSONResponse(
            content={"status": "success", "avatar_url": public_url, "user": _user_public_dict(user)}
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})