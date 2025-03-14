from langchain.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain
from langchain_ollama import ChatOllama

llm = ChatOllama(model="llama2")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that can answer questions."),
    ("system", "Previous conversation:\n{chat_history}"),
    ("human", "{input}"),
])

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    input_key="input",
)

# Initialize the chain properly using LLMChain
chain = LLMChain(
    llm=llm,
    prompt=prompt,
    memory=memory,
    verbose=True
)

while True:
    usr_input = input("\nYou: ")
    if usr_input.lower() == "/bye":
        print("Chatbot: Goodbye!")
        break
    else:
        response = chain.invoke({"input": usr_input}, stream=True)
        print(f"Chatbot: {response}")
