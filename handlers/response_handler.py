from helpers.chat_helper import ChatHelper
from services.llm_model import get_llm_model
from helpers.storage_helper import get_or_create_vectorstore
from constance.prompts import SYSTEM_PROMPT
from langchain.chains import LLMChain


def get_response(user_input: str) -> str:
    vectorstore = get_or_create_vectorstore()
    results = vectorstore.similarity_search(user_input, k=2)
    context = "\n".join([doc.page_content for doc in results])
    
    llm = get_llm_model()
    
    chat_helper = ChatHelper(system_prompt=SYSTEM_PROMPT, human_prompt=user_input)
    
    chain = LLMChain(
        llm=llm,
        prompt=chat_helper.prompt,
        memory=chat_helper.create_or_get_memory("chat_history"),
    )
    
    response = chain.invoke({"input": user_input})
    
    return response

