SYSTEM_PROMPT = """
You are a helpful assistant that can answer questions about the website.
"""

HUMAN_PROMPT = """
 Perform the following instructions: 
 1. Answer the question using the provided context. Your answer should be in your own words and be no longer than 50 words.
 2. If The user talk about casually something else, answer it as a casual conversation.
 3. Format the response in markdown format. 
  Context: {context}
  Question: {query}
"""
