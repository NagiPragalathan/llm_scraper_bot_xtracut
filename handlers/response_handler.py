from helpers.chat_helper import ChatHelper
from services.llm_model import get_llm_model
from helpers.storage_helper import get_or_create_vectorstore


llm = get_llm_model()

def get_response(user_input: str) -> str:
    vectorstore = get_or_create_vectorstore()
    results = vectorstore.similarity_search(user_input, k=2)
    context = "\n".join([doc.page_content for doc in results])
    print(context)
    # chat_helper = ChatHelper(system_prompt=context, human_prompt=user_input)
