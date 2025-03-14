from helpers.chat_helper import ChatHelper
from services.llm_model import get_llm_model
from helpers.storage_helper import get_or_create_vectorstore
from constance.prompts import SYSTEM_PROMPT, HUMAN_PROMPT
from langchain.chains import LLMChain
from typing import Generator, Union


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

        chain = LLMChain(
            llm=llm,
            prompt=chat_helper.prompt,
            memory=chat_helper.create_or_get_memory("chat_history"),
        )

        if stream:
            obj =  chain.stream({"query": user_input, "context": context})
        
        response = chain.invoke({"query": user_input, "context": context})

        return response.get("output_text", "") if isinstance(response, dict) else str(response)

    except Exception as e:
        print(f"Error in get_response: {e}")
        return None
    
    
