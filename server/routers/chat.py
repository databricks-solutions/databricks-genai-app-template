"""Chat management endpoints for managing chat sessions.

All endpoints are scoped to the current authenticated user.
Chat creation and message storage is handled by /invoke_endpoint.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel

from ..auth.user_service import get_current_user
from ..chat_storage import storage

logger = logging.getLogger(__name__)
router = APIRouter()


class UpdateChatRequest(BaseModel):
  """Request to update a chat."""

  title: Optional[str] = None


@router.get('/chats')
async def get_all_chats(request: Request):
  """Get all chats for the current user sorted by updated_at (newest first).

  Returns list of chat objects with messages.
  """
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Fetching all chats for user: {user_email}')
  chats = user_storage.get_all()
  logger.info(f'Retrieved {len(chats)} chats for user: {user_email}')

  # Convert to dict for JSON serialization
  return [chat.dict() for chat in chats]


@router.get('/chats/{chat_id}')
async def get_chat_by_id(request: Request, chat_id: str):
  """Get specific chat by ID for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Fetching chat {chat_id} for user: {user_email}')

  chat = user_storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id} for user: {user_email}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  logger.info(f'Retrieved chat {chat_id} with {len(chat.messages)} messages for user: {user_email}')
  return chat.dict()


@router.patch('/chats/{chat_id}')
async def update_chat(request: Request, chat_id: str, body: UpdateChatRequest):
  """Update a chat (e.g., rename title) for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Updating chat {chat_id} for user: {user_email}')

  chat = user_storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id} for user: {user_email}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  # Update title if provided
  if body.title is not None:
    chat.title = body.title
    logger.info(f'Updated chat {chat_id} title to: {body.title}')

  return chat.dict()


@router.delete('/chats/{chat_id}')
async def delete_chat_by_id(request: Request, chat_id: str):
  """Delete specific chat by ID for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Deleting chat {chat_id} for user: {user_email}')

  success = user_storage.delete(chat_id)
  if not success:
    logger.warning(f'Chat not found for deletion: {chat_id} for user: {user_email}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  logger.info(f'Chat deleted: {chat_id} for user: {user_email}')
  return {'success': True, 'deleted_chat_id': chat_id}


@router.delete('/chats')
async def clear_all_chats(request: Request):
  """Delete all chats for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Clearing all chats for user: {user_email}')

  count = user_storage.clear_all()

  logger.info(f'Cleared {count} chats for user: {user_email}')
  return {'success': True, 'deleted_count': count}
