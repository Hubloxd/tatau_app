from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
from models.image_tag import image_tags

class Image(Base):
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    image_url = Column(String)
    description = Column(String)
    uploaded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    mime_type = Column(String, nullable=True)

    owner = relationship("User", back_populates="images")
    
    tags = relationship("Tag", secondary=image_tags, back_populates="images")
    interactions = relationship("Interaction", back_populates="image")
    comments = relationship("Comment", back_populates="image")