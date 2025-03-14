from helpers.chat_helper import ChatHelper
from services.llm_model import get_llm_model
from helpers.storage_helper import get_or_create_vectorstore
from constance.prompts import SYSTEM_PROMPT, HUMAN_PROMPT
from langchain.chains import LLMChain
from typing import Generator, Union


def get_response(user_input: str, session_id: str, stream: bool = False, messages: list = False) -> Union[str, Generator[str, None, None]]:
    """
    Generates a response using the LLM model with vectorstore-enhanced context.

    Args:
        user_input (str): The input from the user.
        session_id (str): The session ID.
        stream (bool): Whether to stream the response or return it directly.

    Returns:
        Union[str, Generator[str, None, None]]: The generated response as a string or a generator for streaming.
    """
    vectorstore = get_or_create_vectorstore()
    results = vectorstore.similarity_search(user_input, k=2)
    context = "\n".join([doc.page_content for doc in results])
    llm = get_llm_model()
    # llm = get_llm_model(llm_model="groq", model_name="llama-3.3-70b-versatile", temperature=0.5, api_key="oB")
    chat_helper = ChatHelper(system_prompt=SYSTEM_PROMPT, human_prompt=HUMAN_PROMPT)
    chain = chat_helper.prompt | llm
    
    if messages:
        payload = {
            "query": user_input,
            "context": context,
            "chat_history": messages
        }
    else:
        payload = {
            "query": user_input,
            "context": context,
            "chat_history": chat_helper.get_memory_list(session_id)
        }
    print(payload)
    response = ""
    if stream:
        obj =  chain.stream(payload)
        for chunk in obj:
            response = response + chunk.content
            yield chunk.content
        print("stream end")
    else:
        response = chain.invoke(payload)
    
    if not messages:    
        chat_helper.add_user_message(session_id, user_input)
        chat_helper.add_assistant_message(session_id, response)
        print(chat_helper.get_memory_list(session_id))
    
    if not stream:
        return response.get("output_text", "") if isinstance(response, dict) else str(response)
