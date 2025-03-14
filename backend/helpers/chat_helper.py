from typing import Any, Dict, List
from langchain.prompts import ChatPromptTemplate

class ChatHistory:
    """Manages chat messages with session-based storage."""
    
    _store: Dict[str, List[Dict[str, str]]] = {}

    def __init__(self, session_id: str):
        self.session_id = session_id
        if session_id not in self._store:
            self._store[session_id] = []

    def add_user_message(self, message: str):
        """Stores user message under the session."""
        self._store[self.session_id].append({"role": "user", "content": message})

    def add_assistant_message(self, message: str):
        """Stores assistant message under the session."""
        self._store[self.session_id].append({"role": "assistant", "content": message})

    def get_chat_history(self) -> List[Dict[str, str]]:
        """Retrieves chat history for the session."""
        return self._store.get(self.session_id, [])
    
    

    @classmethod
    def clear_session(cls, session_id: str):
        """Clears history for a specific session."""
        if session_id in cls._store:
            del cls._store[session_id]

    @classmethod
    def clear_all(cls):
        """Clears all stored chat histories."""
        cls._store.clear()


class ChatHelper:
    """Handles chat prompts and memory retrieval."""
    
    def __init__(self, system_prompt: str, human_prompt: str):
        self.system_prompt = system_prompt
        self.human_prompt = human_prompt

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("system", "Previous conversation:\n{chat_history}"),
            ("human", self.human_prompt),
        ])

    def get_memory_string(self, session_id: str) -> str:
        """Returns chat history as a formatted string."""
        chat_history = ChatHistory(session_id)
        return "\n".join([f"{msg['role']}: {msg['content']}" for msg in chat_history.get_chat_history()])

    def get_memory_list(self, session_id: str) -> List[Dict[str, str]]:
        """Returns chat history as a list of messages."""
        chat_history = ChatHistory(session_id)
        return chat_history.get_chat_history()

    def add_user_message(self, session_id: str, message: str):
        """Stores a user message in the session history."""
        chat_history = ChatHistory(session_id)
        chat_history.add_user_message(message)

    def add_assistant_message(self, session_id: str, message: str):
        """Stores an assistant message in the session history."""
        chat_history = ChatHistory(session_id)
        chat_history.add_assistant_message(message)
