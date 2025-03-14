from langchain_community.document_loaders import AsyncChromiumLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

def scrape_website(url: list[str]) -> str:
    loader = AsyncChromiumLoader(urls=url)
    documents = loader.load()
    transformer = BeautifulSoupTransformer()
    visible_docs = transformer.transform_documents(documents, tags_to_extract=["p", "span", "h1", "h2", "h3", "h4", "h5", "h6","a"], remove_unwanted_tags=[ "script", "style"])

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(visible_docs)

    return chunks
