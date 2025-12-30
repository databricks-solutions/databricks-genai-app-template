"""Chat management endpoints for managing chat sessions.

All endpoints are scoped to the current authenticated user.
Chat creation and message storage is handled by /invoke_endpoint.
"""

import logging

from fastapi import APIRouter, Request
from fastapi.responses import Response

from ..chat_storage import storage
from ..services.user import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get('/chats')
async def get_all_chats(request: Request):
  """Get all chats for the current user sorted by updated_at (newest first).

  Returns list of chat summary objects (without messages for performance).
  Use GET /chats/{chat_id} to fetch full chat with messages.
  """
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Fetching all chats for user: {user_email}')
  chats = await user_storage.get_all()
  logger.info(f'Retrieved {len(chats)} chats for user: {user_email}')

  # Return summary (without messages) for list view performance
  return [chat.to_dict_summary() for chat in chats]


@router.get('/chats/{chat_id}')
async def get_chat_by_id(request: Request, chat_id: str):
  """Get specific chat by ID for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Fetching chat {chat_id} for user: {user_email}')

  chat = await user_storage.get(chat_id)
  if not chat:
    logger.warning(f'Chat not found: {chat_id} for user: {user_email}')
    return Response(content=f'Chat {chat_id} not found', status_code=404)

  logger.info(f'Retrieved chat {chat_id} with {len(chat.messages)} messages for user: {user_email}')
  return chat.to_dict()


@router.delete('/chats/{chat_id}')
async def delete_chat_by_id(request: Request, chat_id: str):
  """Delete specific chat by ID for the current user."""
  user_email = await get_current_user(request)
  user_storage = storage.get_storage_for_user(user_email)

  logger.info(f'Deleting chat {chat_id} for user: {user_email}')

  success = await user_storage.delete(chat_id)
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

  count = await user_storage.clear_all()

  logger.info(f'Cleared {count} chats for user: {user_email}')
  return {'success': True, 'deleted_count': count}
