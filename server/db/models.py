"""SQLAlchemy models for chat storage.

This module defines the database schema for persistent chat storage.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
  """Base class for all SQLAlchemy models."""

  pass


class ChatModel(Base):
  """SQLAlchemy model for chat sessions."""

  __tablename__ = 'chats'

  id: Mapped[str] = mapped_column(String(50), primary_key=True)
  user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
  title: Mapped[str] = mapped_column(String(255), default='New Chat')
  agent_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=func.now(), nullable=False
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False
  )

  # Relationship to messages
  messages: Mapped[list['MessageModel']] = relationship(
    'MessageModel',
    back_populates='chat',
    cascade='all, delete-orphan',
    order_by='MessageModel.timestamp',
  )

  __table_args__ = (
    Index('ix_chats_user_updated', 'user_email', 'updated_at'),
  )

  def to_dict(self) -> dict:
    """Convert to dictionary for JSON serialization (includes messages)."""
    return {
      'id': self.id,
      'user_email': self.user_email,
      'title': self.title,
      'agent_id': self.agent_id,
      'created_at': self.created_at.isoformat() if self.created_at else None,
      'updated_at': self.updated_at.isoformat() if self.updated_at else None,
      'messages': [msg.to_dict() for msg in self.messages] if self.messages else [],
    }

  def to_dict_summary(self) -> dict:
    """Convert to summary dictionary (excludes messages for list views)."""
    return {
      'id': self.id,
      'user_email': self.user_email,
      'title': self.title,
      'agent_id': self.agent_id,
      'created_at': self.created_at.isoformat() if self.created_at else None,
      'updated_at': self.updated_at.isoformat() if self.updated_at else None,
    }


class MessageModel(Base):
  """SQLAlchemy model for chat messages."""

  __tablename__ = 'messages'

  id: Mapped[str] = mapped_column(String(50), primary_key=True)
  chat_id: Mapped[str] = mapped_column(
    String(50), ForeignKey('chats.id', ondelete='CASCADE'), nullable=False, index=True
  )
  role: Mapped[str] = mapped_column(String(20), nullable=False)
  content: Mapped[str] = mapped_column(Text, nullable=False)
  timestamp: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=func.now(), nullable=False
  )
  trace_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
  trace_summary: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
  is_error: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

  # Relationship back to chat
  chat: Mapped['ChatModel'] = relationship('ChatModel', back_populates='messages')

  __table_args__ = (
    Index('ix_messages_chat_timestamp', 'chat_id', 'timestamp'),
  )

  def to_dict(self) -> dict:
    """Convert to dictionary for JSON serialization."""
    return {
      'id': self.id,
      'chat_id': self.chat_id,
      'role': self.role,
      'content': self.content,
      'timestamp': self.timestamp.isoformat() if self.timestamp else None,
      'trace_id': self.trace_id,
      'trace_summary': self.trace_summary,
      'is_error': self.is_error,
    }
