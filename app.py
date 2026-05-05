import os
import tempfile
import subprocess
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import ollama

# Importing from our local module[cite: 1]
from doc_analyzer import get_text_from_any_file, get_relevant_context

app = Flask(__name__)
CORS(app)

# Settings
LOCAL_MODEL = 'gemma3:4b' 

# ==========================================
# 1. AUTOMATIC OLLAMA STARTUP[cite: 1]
# ==========================================
def start_ollama_automatically():
    try:
        # Check if process is running[cite: 1]
        task_check = subprocess.check_output('tasklist', shell=True).decode()
        if "ollama.exe" not in task_check:
            print(">>> Starting Ollama server...")
            subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(5) 
            print(">>> Ollama is ready.")
        else:
            print(">>> Ollama is already running.")
    except Exception as e:
        print(f">>> Auto-start failed: {e}")

start_ollama_automatically()

# ==========================================
# 2. STATIC FILES & ROUTES
# ==========================================

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ==========================================
# 3. MODELS & API ROUTES[cite: 1]
# ==========================================

@app.route('/api/ai/transcribe', methods=['POST'])
def transcribe_audio():
    global whisper_model
    if 'whisper_model' not in globals():
        print(">>> Loading Whisper STT (Lazy Load)...")
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

    if 'audio' not in request.files:
        return jsonify({"error": "No audio"}), 400

    audio_file = request.files['audio']
    temp_path = os.path.join(tempfile.gettempdir(), "macaw_rec.webm")
    audio_file.save(temp_path)

    try:
        segments, _ = whisper_model.transcribe(temp_path, beam_size=5, language="gu")
        text = "".join([s.text for s in segments])
        os.remove(temp_path)
        return jsonify({"status": "success", "text": text.strip()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/upload-and-analyze', methods=['POST'])
def upload_and_analyze():
    user_query = request.form.get('query', '')
    uploaded_file = request.files.get('file')

    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    # High-speed reading[cite: 1]
    full_text, error = get_text_from_any_file(uploaded_file)
    if error: 
        return jsonify({"error": error}), 400

    # Context extraction[cite: 1]
    analyzed_context = get_relevant_context(full_text, user_query)

    # Strict Gujarati Prompt[cite: 1]
    prompt = f"""તમે એક અત્યંત કડક ડોક્યુમેન્ટ રીડર અને ટ્રાન્સલેટર છો. 
તમારો જવાબ માત્ર શુદ્ધ ગુજરાતીમાં જ હોવો જોઈએ.

CONTEXT:
{analyzed_context}

USER QUESTION:
{user_query}
"""

    try:
        response = ollama.generate(model=LOCAL_MODEL, prompt=prompt)
        return jsonify({"status": "success", "result": response['response']}), 200
    except Exception as e:
        return jsonify({"error": "LLM Connection Error", "details": str(e)}), 500

if __name__ == '__main__':
    print(">>> Macaw Server live at http://127.0.0.1:5000")
    app.run(debug=False, port=5000)
