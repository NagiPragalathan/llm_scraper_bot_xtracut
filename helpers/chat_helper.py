from typing import Any
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langchain.memory import ConversationBufferMemory

def get_memory() -> ConversationBufferMemory:
    return ConversationBufferMemory(memory_key="chat_history", return_messages=True)

class ChatHelper:
    def __init__(self, system_prompt: str, human_prompt: str):
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("system", "Previous conversation:\n{chat_history}"),
            ("human", "{input}"),
        ])

    def add_user_message(self, message: str):
        self.memory.add_user_message(message)

    def add_assistant_message(self, message: str):
        self.memory.add_assistant_message(message)
        
    def create_or_get_memory(self, memory_key: str = "chat_history") -> ConversationBufferMemory:
        if not hasattr(self, '_memory'):
            self._memory = ConversationBufferMemory(
                memory_key=memory_key,
                return_messages=True,
                input_key="input",
            )
        return self._memory
        
    def get_memory_string(self, memory_key: str = "chat_history") -> str:
        return self.create_memory(memory_key).buffer_as_str
