from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings

import os
from helpers.scraping_helper import scrape_website

# Define constants
PERSIST_DIRECTORY = "db"
COLLECTION_NAME = "srmtrichynew"
embeddings = OllamaEmbeddings(model="nomic-embed-text")

def get_or_create_vectorstore() -> Chroma:
    if os.path.exists(PERSIST_DIRECTORY) and os.path.exists(f"{PERSIST_DIRECTORY}/chroma.sqlite3"):
        print("Loading existing vectorstore...")
        return Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embeddings,
            collection_name=COLLECTION_NAME
        )
    else:
        print("Creating new vectorstore...")
        os.makedirs(PERSIST_DIRECTORY, exist_ok=True)
        
        documents = scrape_website(["https://srmtrichynew.in9.cdn-alpha.com/"])
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=PERSIST_DIRECTORY,
            collection_name=COLLECTION_NAME
        )
        return vectorstore
