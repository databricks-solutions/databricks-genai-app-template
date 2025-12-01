"""In-memory chat storage with max 10 chats limit.

This module provides simple in-memory storage for chat sessions.
- Max 10 chats per session (oldest deleted when limit reached)
- Chat persistence only during app runtime
- User isolation not implemented (single-user mode for v1)
"""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class Message(BaseModel):
    """Individual chat message."""

    id: str = Field(..., description="Unique message ID")
    role: str = Field(..., description="Message role: user|assistant|system")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    trace_id: Optional[str] = Field(None, description="MLflow trace ID")
    trace_summary: Optional[dict] = Field(None, description="Trace summary data")


class Chat(BaseModel):
    """Chat session with messages."""

    id: str = Field(..., description="Unique chat ID")
    title: str = Field(default="New Chat", description="Chat title")
    agent_id: Optional[str] = Field(None, description="Selected agent ID")
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ChatStorage:
    """In-memory storage for chat sessions.

    Features:
    - Stores up to max_chats (default 10)
    - Automatically deletes oldest chat when limit reached
    - Simple dictionary-based storage
    """

    def __init__(self, max_chats: int = 10):
        """Initialize storage with max chat limit."""
        self.chats: Dict[str, Chat] = {}
        self.max_chats = max_chats

    def get_all(self) -> List[Chat]:
        """Get all chats sorted by updated_at (newest first)."""
        return sorted(
            self.chats.values(),
            key=lambda c: c.updated_at,
            reverse=True
        )

    def get(self, chat_id: str) -> Optional[Chat]:
        """Get specific chat by ID."""
        return self.chats.get(chat_id)

    def create(self, title: str = "New Chat", agent_id: Optional[str] = None) -> Chat:
        """Create new chat.

        If max_chats limit reached, deletes the oldest chat.

        Args:
            title: Chat title (default: "New Chat")
            agent_id: Selected agent ID (optional)

        Returns:
            Newly created Chat object
        """
        # Enforce max limit - delete oldest chat if needed
        if len(self.chats) >= self.max_chats:
            oldest = min(self.chats.values(), key=lambda c: c.updated_at)
            del self.chats[oldest.id]

        # Create new chat
        chat_id = f"chat_{uuid.uuid4().hex[:12]}"
        new_chat = Chat(
            id=chat_id,
            title=title,
            agent_id=agent_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        self.chats[chat_id] = new_chat
        return new_chat

    def add_message(self, chat_id: str, msg: Message) -> bool:
        """Add message to existing chat.

        Also updates chat.updated_at and auto-generates title from first user message.

        Args:
            chat_id: Chat ID to add message to
            msg: Message object to add

        Returns:
            True if successful, False if chat not found
        """
        chat = self.chats.get(chat_id)
        if not chat:
            return False

        chat.messages.append(msg)
        chat.updated_at = datetime.now()

        # Auto-generate title from first user message
        if len(chat.messages) == 1 and msg.role == "user":
            chat.title = msg.content[:50] + ("..." if len(msg.content) > 50 else "")

        return True

    def delete(self, chat_id: str) -> bool:
        """Delete chat by ID.

        Args:
            chat_id: Chat ID to delete

        Returns:
            True if deleted, False if not found
        """
        if chat_id in self.chats:
            del self.chats[chat_id]
            return True
        return False

    def clear_all(self) -> int:
        """Delete all chats.

        Returns:
            Number of chats deleted
        """
        count = len(self.chats)
        self.chats.clear()
        return count


# Global singleton instance
storage = ChatStorage(max_chats=10)
