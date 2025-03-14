from handlers.response_handler import get_response


while True:
    user_input = input("You: ")
    if user_input and user_input != "exit" and user_input != "":
        for chunk in get_response(user_input, session_id="1", stream=True):
            print(chunk, end="", flush=True)
        print("-"*100)
        print("chat response end")
        print("-"*100)