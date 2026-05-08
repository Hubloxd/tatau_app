import logging
import re

import bcrypt
from sqlalchemy.exc import IntegrityError
from models.user import User

logger = logging.getLogger(__name__)

# Dozwolone znaki bezpieczne dla wyświetlania / bez < > % itd.
_SAFE_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
# Nick: bez HTML / XSS; litery, cyfry, kropka, podkreślenie, myślnik.
_SAFE_USERNAME_RE = re.compile(r"^[a-zA-Z0-9._-]{2,32}$")


def validate_username_format(username: str) -> str:
    s = username.strip()
    if not _SAFE_USERNAME_RE.fullmatch(s):
        raise ValueError("invalid_username")
    return s


def validate_email_format(email: str) -> str:
    s = email.strip()
    if not _SAFE_EMAIL_RE.fullmatch(s):
        raise ValueError("invalid_email")
    return s


def _unique_violation_target(exc: IntegrityError) -> str | None:
    """PostgreSQL / inne: które pole naruszyło unikalność ('email', 'username')."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        diag = getattr(orig, "diag", None)
        if diag is not None:
            cname = getattr(diag, "constraint_name", None)
            if cname:
                cn = cname.decode() if isinstance(cname, bytes) else str(cname)
                cl = cn.lower()
                if "email" in cl:
                    return "email"
                if "username" in cl:
                    return "username"
    msg = str(exc).lower()
    if "ix_users_email" in msg or "key (email)=" in msg:
        return "email"
    if "ix_users_username" in msg or "key (username)=" in msg:
        return "username"
    return None


def add_user(session, username, email, password, user_type):
    username = validate_username_format(username)
    email = validate_email_format(email)
    hashed_password = set_password(password)
    new_user = User(username=username, email=email, password_hash=hashed_password, user_type=user_type)
    session.add(new_user)
    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        target = _unique_violation_target(e)
        if target == "email":
            raise ValueError("email_taken") from None
        if target == "username":
            raise ValueError("username_taken") from None
        logger.warning("IntegrityError przy add_user (nieznany constraint): %s", e)
        raise ValueError("registration_conflict") from None
    return new_user

def delete_user(session, user_id):
    user = session.query(User).filter_by(id=user_id).first()
    if user:
        session.delete(user)
        session.commit()
        return True
    return False

def get_user(session, user_id):
    return session.query(User).filter_by(id=user_id).first()

def get_user_by_username(session, username):
    return session.query(User).filter_by(username=username).first()

def get_user_by_email(session, email):
    return session.query(User).filter_by(email=email).first()

def update_user(session, user_id, username=None, password=None):
    user = session.query(User).filter_by(id=user_id).first()
    if user:
        if username:
            user.username = validate_username_format(username)
        if password:
            user.password_hash = set_password(password)
        session.commit()
        return True
    return False


def update_user_profile(session, user_id: int, email=None, bio=None, profile_public=None):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        return False
    if email is not None:
        email = validate_email_format(email)
        existing = get_user_by_email(session, email)
        if existing and existing.id != user_id:
            raise ValueError("email_taken")
        user.email = email
    if bio is not None:
        trimmed = bio.strip()[:2000]
        user.bio = trimmed if trimmed else None
    if profile_public is not None:
        user.profile_public = bool(profile_public)
    session.commit()
    return True


def update_user_password(session, user_id: int, old_password: str, new_password: str):
    user = session.query(User).filter_by(id=user_id).first()
    if not user or not check_password(user, old_password):
        return False
    user.password_hash = set_password(new_password)
    session.commit()
    return True


def set_user_avatar_url(session, user_id: int, url: str):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        return False
    user.avatar_url = url
    session.commit()
    return True

def set_password(password):
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    return password_hash

def check_password(user, password):
    password_bytes = password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, user.password_hash.encode('utf-8'))

def authenticate_user(session, username_or_email, password):
    """
    Authenticate a user by username/email and password
    
    Args:
        session: SQLAlchemy database session
        username_or_email: Username or email of the user
        password: Plain text password
        
    Returns:
        User object if authentication succeeds, None otherwise
    """
    # Try to find user by username
    user = get_user_by_username(session, username_or_email)
    
    # If not found, try by email
    if not user:
        user = get_user_by_email(session, username_or_email)
    
    # If user found, check password
    if user and check_password(user, password):
        return user
        
    return None

def search_users_by_term(session, search_term):
    return session.query(User).filter(
        (User.username.ilike(f"%{search_term}%")) | 
        (User.email.ilike(f"%{search_term}%"))
    ).all()

def add_follow(session, follower_id, followed_id):
    follower = get_user(session, follower_id)
    followed = get_user(session, followed_id)
    if follower and followed:
        if followed not in follower.following:
            follower.following.append(followed)
            session.commit()
        return True
    return False

def remove_follow(session, follower_id, followed_id):
    follower = get_user(session, follower_id)
    followed = get_user(session, followed_id)
    if follower and followed:
        if followed in follower.following:
            follower.following.remove(followed)
            session.commit()
        return True
    return False

def is_following(session, follower_id, followed_id):
    follower = get_user(session, follower_id)
    followed = get_user(session, followed_id)
    if not follower or not followed:
        return False
    return followed in follower.following