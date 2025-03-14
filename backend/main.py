from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from handlers.response_handler import get_response
import uuid

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    session_id = data.get('session_id', str(uuid.uuid4()))
    stream = data.get('stream', False)
    messages = data.get('messages', [])
    
    if not user_input:
        return jsonify({"error": "No message provided"}), 400
    
    if stream:
        def generate():
            for chunk in get_response(user_input, session_id=session_id, stream=True, messages=messages):
                yield f"data: {chunk}\n\n"
        
        return Response(generate(), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        })
    else:
        response = get_response(user_input, session_id=session_id, stream=False, messages=messages)
        return jsonify({"response": response, "session_id": session_id})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)