from helpers.chat_helper import ChatHelper
from services.llm_model import get_llm_model
from helpers.storage_helper import get_or_create_vectorstore
from constance.prompts import SYSTEM_PROMPT, HUMAN_PROMPT
from langchain.chains import LLMChain
from typing import Generator, Union
from langchain.schema.runnable import RunnableParallel, RunnableLambda


def get_response(user_input: str, stream: bool = False) -> Union[str, Generator[str, None, None]]:
    """
    Generates a response using the LLM model with vectorstore-enhanced context.

    Args:
        user_input (str): The input from the user.
        stream (bool): Whether to stream the response or return it directly.

    Returns:
        Union[str, Generator[str, None, None]]: The generated response as a string or a generator for streaming.
    """
    try:
        vectorstore = get_or_create_vectorstore()
        results = vectorstore.similarity_search(user_input, k=2)
        context = "\n".join([doc.page_content for doc in results])

        llm = get_llm_model(model_name="deepseek-r1:7b")

        chat_helper = ChatHelper(system_prompt=SYSTEM_PROMPT, human_prompt=HUMAN_PROMPT)
        memory = chat_helper.create_or_get_memory()

        # Fix: Properly retrieve chat history
        def get_chat_history(_):
            return {
                "chat_history": "\n".join([msg.content for msg in memory.chat_memory.messages]) if memory.chat_memory.messages else "No prior conversation"
            }

        # RunnableParallel for fetching memory before processing
        streaming_chain = (
            RunnableParallel(
                {
                    "chat_history": RunnableLambda(get_chat_history),
                    "input": lambda x: x["input"],
                    "query": lambda x: x["query"],
                    "context": lambda x: x["context"],
                }
            )
            | chat_helper.prompt
            | llm
        )

        if stream:
            for chunk in streaming_chain.stream({"input": user_input, "query": user_input, "context": context}):
                yield chunk  # Properly streams the response

        # Direct response
        response = streaming_chain.invoke({"input": user_input, "query": user_input, "context": context})

        # Save conversation history properly
        memory.save_context({"input": user_input}, {"output": response})
        
        # Debugging: Print stored messages
        print("Chat History:", [msg.content for msg in memory.chat_memory.messages])

        return response
    except Exception as e:
        print(f"Error in get_response: {e}")
        return None
