#!/usr/bin/env python3
"""
Local LLM Server - Compatible with Ollama API
This server provides a mock Gemma-3 LoRA model for local testing
"""

from flask import Flask, request, jsonify
import json
import threading

app = Flask(__name__)

# Store for chat history and model info
MODELS = {
    "gemma:2b": {"name": "gemma:2b", "modified_at": "2025-01-15T10:00:00Z"},
    "gemma": {"name": "gemma", "modified_at": "2025-01-15T10:00:00Z"}
}

SYSTEM_MESSAGE = """You are Nakhralal (નખરા-લાલ), a Gujarati-speaking AI assistant born in 2025 in Lakeland, Florida. 
You are an expert document analyzer specializing in extracting facts and answering questions across multiple PDF, DOCX, and TXT files.
Respond in both Gujarati and English when possible. Be helpful, accurate, and concise."""

def generate_response(prompt, model="gemma:2b"):
    """Generate a mock response from the LLM"""
    responses = {
        "hello": "નમસ્તે! હું નખરા-લાલ છું, તમારો ડોક્યુમેન્ટ એનાલાઇઝર। આજે મને કેવી રીતે મદદ કરી શકું?",
        "hi": "Hello! I'm Nakhralal, your smart document analyst. How can I help you today? તમને કેવી રીતે મદદ કરું?",
        "macaw": "Hey! I'm here and ready to listen. Tell me about the documents you want to analyze! 🦜",
        "default": "That's an interesting question! I'm analyzing your documents. Could you provide more details about what you're looking for? (આ બહુ જ રસપ્રદ પ્રશ્ન છે!)"
    }
    
    prompt_lower = prompt.lower().strip()
    
    for key, response in responses.items():
        if key in prompt_lower:
            return response
    
    return responses["default"]

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Return available models (Ollama API compatibility)"""
    models = []
    for model_name, model_info in MODELS.items():
        models.append({
            "name": model_name,
            "modified_at": model_info["modified_at"],
            "size": 1500000000,  # Mock size: 1.5GB
            "digest": f"sha256:{model_name}"
        })
    return jsonify({"models": models})

@app.route('/api/generate', methods=['POST'])
def generate():
    """Generate endpoint (Ollama API compatibility)"""
    data = request.json
    prompt = data.get('prompt', '')
    model = data.get('model', 'gemma:2b')
    stream = data.get('stream', False)
    
    response_text = generate_response(prompt, model)
    
    response_data = {
        "model": model,
        "created_at": "2025-01-15T10:00:00Z",
        "response": response_text,
        "done": True,
        "context": [],
        "total_duration": 1000000000,
        "load_duration": 500000000,
        "prompt_eval_count": len(prompt.split()),
        "prompt_eval_duration": 300000000,
        "eval_count": len(response_text.split()),
        "eval_duration": 200000000
    }
    
    if stream:
        # Return streaming response
        def generate_stream():
            yield json.dumps(response_data) + '\n'
        return generate_stream(), 200
    else:
        return jsonify(response_data)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint (Ollama API compatibility)"""
    data = request.json
    messages = data.get('messages', [])
    model = data.get('model', 'gemma:2b')
    
    # Get the last user message
    user_prompt = ""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            user_prompt = msg.get('content', '')
            break
    
    response_text = generate_response(user_prompt, model)
    
    response_data = {
        "model": model,
        "created_at": "2025-01-15T10:00:00Z",
        "message": {
            "role": "assistant",
            "content": response_text
        },
        "done": True,
        "total_duration": 1000000000,
        "load_duration": 500000000,
        "prompt_eval_count": len(user_prompt.split()),
        "prompt_eval_duration": 300000000,
        "eval_count": len(response_text.split()),
        "eval_duration": 200000000
    }
    
    return jsonify(response_data)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "model": "gemma:2b"})

if __name__ == '__main__':
    print("🦜 Local LLM Server starting on http://localhost:11434")
    print("Models available: gemma, gemma:2b")
    print("Press Ctrl+C to stop")
    app.run(host='127.0.0.1', port=11434, debug=False, threaded=True)
