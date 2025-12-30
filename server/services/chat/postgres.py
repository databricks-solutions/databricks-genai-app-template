"""PostgreSQL chat storage implementation (async).

This module provides persistent chat storage using PostgreSQL with async SQLAlchemy.
All database operations are non-blocking.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from server.db import ChatModel, MessageModel, session_scope

from .base import BaseChatStorage, BaseUserScopedChatStorage


class PostgresChatStorage(BaseChatStorage):
  """Async PostgreSQL storage for chat sessions for a single user.

  Features:
  - Persistent storage in PostgreSQL
  - Non-blocking async operations
  - Stores up to max_chats (default 10)
  - Automatically deletes oldest chat when limit reached
  """

  def __init__(self, user_email: str, max_chats: int = 10):
    """Initialize storage with user email and max chat limit."""
    self.user_email = user_email
    self.max_chats = max_chats

  async def get_all(self) -> List[ChatModel]:
    """Get all chats sorted by updated_at (newest first).

    Note: Does NOT load messages for performance. Use get() to fetch full chat.
    """
    async with session_scope() as session:
      stmt = (
        select(ChatModel)
        .where(ChatModel.user_email == self.user_email)
        .order_by(ChatModel.updated_at.desc())
      )
      result = await session.execute(stmt)
      chats = result.scalars().all()
      # Return detached copies (without messages loaded)
      return list(chats)

  async def get(self, chat_id: str) -> Optional[ChatModel]:
    """Get specific chat by ID."""
    async with session_scope() as session:
      stmt = (
        select(ChatModel)
        .options(selectinload(ChatModel.messages))
        .where(
          ChatModel.id == chat_id,
          ChatModel.user_email == self.user_email,
        )
      )
      result = await session.execute(stmt)
      return result.scalar_one_or_none()

  async def create(self, title: str = 'New Chat', agent_id: Optional[str] = None) -> ChatModel:
    """Create new chat.

    If max_chats limit reached, deletes the oldest chat.
    """
    async with session_scope() as session:
      # Count current chats
      count_stmt = (
        select(func.count())
        .select_from(ChatModel)
        .where(ChatModel.user_email == self.user_email)
      )
      result = await session.execute(count_stmt)
      current_count = result.scalar()

      # Delete oldest if at limit
      if current_count >= self.max_chats:
        oldest_stmt = (
          select(ChatModel)
          .where(ChatModel.user_email == self.user_email)
          .order_by(ChatModel.updated_at.asc())
          .limit(1)
        )
        result = await session.execute(oldest_stmt)
        oldest = result.scalar_one_or_none()
        if oldest:
          await session.delete(oldest)

      # Create new chat
      chat_id = f'chat_{uuid.uuid4().hex[:12]}'
      now = datetime.now()
      new_chat = ChatModel(
        id=chat_id,
        user_email=self.user_email,
        title=title,
        agent_id=agent_id,
        created_at=now,
        updated_at=now,
      )
      session.add(new_chat)
      await session.flush()

      # Re-fetch with eager loading to avoid lazy load issues
      stmt = (
        select(ChatModel)
        .options(selectinload(ChatModel.messages))
        .where(ChatModel.id == chat_id)
      )
      result = await session.execute(stmt)
      return result.scalar_one()

  async def add_message(self, chat_id: str, msg: MessageModel) -> bool:
    """Add message to existing chat."""
    async with session_scope() as session:
      # Find the chat
      stmt = select(ChatModel).where(
        ChatModel.id == chat_id,
        ChatModel.user_email == self.user_email,
      )
      result = await session.execute(stmt)
      chat = result.scalar_one_or_none()
      if not chat:
        return False

      # Set chat_id on message and add
      msg.chat_id = chat_id
      session.add(msg)

      # Update chat timestamp
      chat.updated_at = datetime.now()

      # Auto-generate title from first user message
      msg_count_stmt = (
        select(func.count())
        .select_from(MessageModel)
        .where(MessageModel.chat_id == chat_id)
      )
      count_result = await session.execute(msg_count_stmt)
      msg_count = count_result.scalar()
      if msg_count == 0 and msg.role == 'user':
        chat.title = msg.content[:50] + ('...' if len(msg.content) > 50 else '')

      return True

  async def update_title(self, chat_id: str, title: str) -> bool:
    """Update chat title."""
    async with session_scope() as session:
      stmt = select(ChatModel).where(
        ChatModel.id == chat_id,
        ChatModel.user_email == self.user_email,
      )
      result = await session.execute(stmt)
      chat = result.scalar_one_or_none()
      if not chat:
        return False
      chat.title = title
      chat.updated_at = datetime.now()
      return True

  async def delete(self, chat_id: str) -> bool:
    """Delete chat by ID."""
    async with session_scope() as session:
      stmt = delete(ChatModel).where(
        ChatModel.id == chat_id,
        ChatModel.user_email == self.user_email,
      )
      result = await session.execute(stmt)
      return result.rowcount > 0

  async def clear_all(self) -> int:
    """Delete all chats."""
    async with session_scope() as session:
      stmt = delete(ChatModel).where(ChatModel.user_email == self.user_email)
      result = await session.execute(stmt)
      return result.rowcount


class PostgresUserScopedChatStorage(BaseUserScopedChatStorage):
  """User-scoped PostgreSQL chat storage manager.

  Creates PostgresChatStorage instances per user (by email).
  Each user has their own isolated chat history in the database.
  """

  def __init__(self, max_chats_per_user: int = 10):
    """Initialize user-scoped storage."""
    self._max_chats_per_user = max_chats_per_user
    self._user_storages: dict[str, PostgresChatStorage] = {}

  def get_storage_for_user(self, user_email: str) -> BaseChatStorage:
    """Get or create PostgresChatStorage for a specific user."""
    if user_email not in self._user_storages:
      self._user_storages[user_email] = PostgresChatStorage(
        user_email=user_email,
        max_chats=self._max_chats_per_user,
      )
    return self._user_storages[user_email]

  async def get_all_users(self) -> List[str]:
    """Get list of all users with chat storage."""
    async with session_scope() as session:
      stmt = select(ChatModel.user_email).distinct()
      result = await session.execute(stmt)
      return list(result.scalars().all())

  async def clear_user_storage(self, user_email: str) -> bool:
    """Clear all storage for a specific user."""
    async with session_scope() as session:
      stmt = delete(ChatModel).where(ChatModel.user_email == user_email)
      result = await session.execute(stmt)
      if user_email in self._user_storages:
        del self._user_storages[user_email]
      return result.rowcount > 0
