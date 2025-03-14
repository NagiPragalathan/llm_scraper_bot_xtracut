from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq

def get_llm_model(llm_model: str = "ollama", model_name: str = "llama2", temperature: float = 0.5, api_key: str = None) -> ChatOllama | ChatGroq:
    if llm_model == "ollama":
        llm = ChatOllama(model=model_name, temperature=temperature)
    elif llm_model == "groq":
        llm = ChatGroq(model=model_name, temperature=temperature, api_key=api_key)
    else:
        raise ValueError(f"Invalid LLM model: {llm_model}, please use 'ollama' or 'groq'")
    return llm
