from handlers.response_handler import get_response

for chunk in get_response("Hello, world!", stream=True):
    print(chunk, end="", flush=True)
