from models.image import Image
from models.user import User
from models.tag import Tag
from models.interaction import Interaction
from models.comment import Comment
from sqlalchemy import desc, func, or_

def add_image(session, user_id, image_url, description=None, tags=None, mime_type=None):
    new_image = Image(
        user_id=user_id,
        image_url=image_url,
        description=description,
        mime_type=mime_type,
    )
    session.add(new_image)
    session.flush()

    if tags and isinstance(tags, list):
        tag_objects = []
        for tag_name in tags:
            tag_name = tag_name.strip().lower()
            if not tag_name:
                continue
            
            tag = session.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
                session.flush()  
            
            tag_objects.append(tag)

        new_image.tags = tag_objects

    session.commit()
    return new_image

def update_image(session, image_id, image_url=None, description=None, tags=None):
    image = session.query(Image).filter_by(id=image_id).first()
    if image:
        if image_url:
            image.image_url = image_url
        if description:
            image.description = description
        if tags and isinstance(tags, list):
            tag_objects = []
            for tag_name in tags:
                tag_name = tag_name.strip().lower()
                if not tag_name:
                    continue
                
                tag = session.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    session.add(tag)
                    session.flush()  
                
                tag_objects.append(tag)

            image.tags = tag_objects

        session.commit()
        return True
    return False

def delete_image(session, image_id):
    image = session.query(Image).filter_by(id=image_id).first()
    if not image:
        return False

    # Remove dependent records to satisfy FK constraints
    session.query(Interaction).filter_by(image_id=image_id).delete(synchronize_session=False)
    session.query(Comment).filter_by(image_id=image_id).delete(synchronize_session=False)

    # Clear many-to-many tags
    image.tags = []

    session.delete(image)
    session.commit()
    return True

def get_image(session, image_id):
    return session.query(Image).filter_by(id=image_id).first()

def get_user_images(session, user_id):
    return (
        session.query(Image)
        .filter_by(user_id=user_id)
        .order_by(desc(Image.uploaded_at), desc(Image.id))
        .all()
    )


def get_user_saved_images(session, user_id):
    """Obrazy zapisane przez użytkownika (interakcja typu save), od najnowszego zapisu."""
    return (
        session.query(Image)
        .join(Interaction, Interaction.image_id == Image.id)
        .filter(
            Interaction.user_id == user_id,
            Interaction.interaction_type == "save",
        )
        .group_by(Image.id)
        .order_by(func.max(Interaction.timestamp).desc())
        .all()
    )

def get_feed_images(
    session,
    limit=20,
    offset=0,
    search_term=None,
    viewer_user_id: int | None = None,
):
    query = session.query(Image).join(User, User.id == Image.user_id)

    if viewer_user_id is not None:
        query = query.filter(
            or_(
                User.profile_public.is_(True),
                Image.user_id == viewer_user_id,
            )
        )
    else:
        query = query.filter(User.profile_public.is_(True))

    if search_term:
        search_term = search_term.strip().lower()        
        tag_images = session.query(Image.id)\
            .join(Image.tags)\
            .filter(Tag.name.ilike(f"%{search_term}%"))\
            .subquery()
            
        query = query.filter(
            or_(
                Image.description.ilike(f"%{search_term}%"),
                Image.id.in_(tag_images)
            )
        )
    
    query = query.order_by(desc(Image.uploaded_at), desc(Image.id))
    
    return query.limit(limit).offset(offset).all()

def get_feed_counts_for_images(session, image_ids: list, user_id: int | None):
    """
    Zwraca mapy: liczba komentarzy (tabela comments), liczba polubień (interactions type=like),
    oraz zbiór id obrazów polubionych przez user_id (jeśli podany).
    """
    if not image_ids:
        return {}, {}, set()

    comment_rows = (
        session.query(Comment.image_id, func.count(Comment.id))
        .filter(Comment.image_id.in_(image_ids))
        .group_by(Comment.image_id)
        .all()
    )
    comment_map = {row[0]: row[1] for row in comment_rows}

    like_rows = (
        session.query(Interaction.image_id, func.count(Interaction.id))
        .filter(
            Interaction.image_id.in_(image_ids),
            Interaction.interaction_type == 'like',
        )
        .group_by(Interaction.image_id)
        .all()
    )
    like_map = {row[0]: row[1] for row in like_rows}

    liked_ids = set()
    if user_id:
        liked_rows = (
            session.query(Interaction.image_id)
            .filter(
                Interaction.image_id.in_(image_ids),
                Interaction.user_id == user_id,
                Interaction.interaction_type == 'like',
            )
            .all()
        )
        liked_ids = {row[0] for row in liked_rows}

    return comment_map, like_map, liked_ids


def get_images_by_tags(session, tag_names, limit=20, offset=0):
    if not tag_names:
        return []
        
    normalized_tags = [name.strip().lower() for name in tag_names if name.strip()]
    
    query = session.query(Image).join(Image.tags).filter(
        Tag.name.in_(normalized_tags)
    ).group_by(Image.id)
    
    if len(normalized_tags) > 1:
        from sqlalchemy import func
        query = query.having(
            func.count(Tag.id) > 0
        ).order_by(
            desc(func.count(Tag.id)),
            desc(Image.id)
        )
    else:
        query = query.order_by(desc(Image.id))
        
    return query.limit(limit).offset(offset).all()