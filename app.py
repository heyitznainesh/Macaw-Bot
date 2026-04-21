import os
import tempfile
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import PyPDF2
import docx
import ollama

app = Flask(__name__)
CORS(app) # ફ્રન્ટએન્ડ અને બેકએન્ડ વચ્ચેના કનેક્શન માટે

# તમારે જે લોકલ મોડલ વાપરવું હોય તેનું નામ અહી લખો (દા.ત., 'gemma3:4b', 'aya', 'llama3')
LOCAL_MODEL = 'gemma3:4b' 

# ==========================================
# INITIALIZE OFFLINE SPEECH MODEL (Whisper)
# ==========================================
print("Loading Whisper model into memory...")
whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
print("Whisper model loaded successfully.")

# ==========================================
# HELPER: Text Extraction (PDF & DOCX)
# ==========================================
def extract_text_from_file(file_storage):
    filename = file_storage.filename.lower()
    extracted_text = ""
    try:
        if filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(file_storage.stream)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        elif filename.endswith('.docx'):
            doc = docx.Document(file_storage.stream)
            for para in doc.paragraphs:
                extracted_text += para.text + "\n"
        else:
            return None, "અમાન્ય ફાઇલ ફોર્મેટ. કૃપા કરીને .pdf અથવા .docx અપલોડ કરો."
        return extracted_text.strip(), None
    except Exception as e:
        return None, f"Failed to parse file: {str(e)}"

# ==========================================
# HELPER: Keyword Analysis & Retrieval
# ==========================================
def get_relevant_context(full_text, query, max_chars=6000):
    paragraphs = [p.strip() for p in full_text.split('\n') if len(p.strip()) > 20]
    
    if not paragraphs:
        return full_text[:max_chars]

    query_words = set(re.findall(r'\w+', query.lower()))
    
    if not query_words:
        return "\n\n".join(paragraphs[:10])

    scored_chunks = []
    for p in paragraphs:
        p_words = set(re.findall(r'\w+', p.lower()))
        score = len(query_words.intersection(p_words))
        scored_chunks.append((score, p))
    
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    relevant_text = ""
    for score, chunk in scored_chunks:
        if len(relevant_text) + len(chunk) < max_chars:
            relevant_text += chunk + "\n\n"
        else:
            break
            
    return relevant_text

# ==========================================
# ENDPOINT: Offline Speech-to-Text (Whisper)
# ==========================================
@app.route('/api/ai/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, "macaw_recording.webm")
    audio_file.save(temp_path)

    try:
        segments, info = whisper_model.transcribe(temp_path, beam_size=5, language="gu")
        extracted_text = "".join([segment.text + " " for segment in segments])
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return jsonify({"status": "success", "text": extracted_text.strip()}), 200
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": "Failed to process audio", "details": str(e)}), 500

# ==========================================
# ENDPOINT: Document Upload & Keyword-Based QA
# ==========================================
@app.route('/api/ai/upload-and-analyze', methods=['POST'])
def upload_and_analyze():
    action = request.form.get('action')
    user_query = request.form.get('query', '')
    uploaded_file = request.files.get('file')

    if not action:
        return jsonify({"error": "Please provide an 'action'."}), 400

    full_document_text = ""
    if uploaded_file and uploaded_file.filename != '':
        full_document_text, error = extract_text_from_file(uploaded_file)
        if error:
            return jsonify({"error": error}), 400
    else:
        return jsonify({"error": "No file uploaded."}), 400

    if not full_document_text or not full_document_text.strip():
        return jsonify({"error": "Could not extract any readable text."}), 400

    analyzed_context = get_relevant_context(full_document_text, user_query)

    if action == 'macaw_chat':
        prompt = f"""તમે એક અત્યંત કડક ડોક્યુમેન્ટ રીડર અને ટ્રાન્સલેટર છો. 
નીચે 'RELEVANT CONTEXT' માં યુઝરના પ્રશ્નને લગતી માહિતી આપેલી છે. 

INSTRUCTIONS (કડક નિયમો):
1. તમારો જવાબ **ફક્ત અને માત્ર શુદ્ધ ગુજરાતી ભાષામાં જ** હોવો જોઈએ. ભલે ફાઇલ English માં હોય કે યુઝરનો પ્રશ્ન English માં હોય, તમારે જવાબ ગુજરાતીમાં જ આપવાનો છે.
2. ફાઇલમાંથી એક્ઝેક્ટ (સચોટ) માહિતી શોધો અને તેને ગુજરાતીમાં અનુવાદ કરીને આપો. ફાઇલમાં ન હોય તેવી કોઈ પણ માહિતી જાતે ઉમેરશો નહીં.
3. જો યુઝરનો પ્રશ્ન બરાબર મેચ ન થતો હોય (Close Match), તો સંદર્ભમાંથી સૌથી નજીકની માહિતી શોધીને લખો: 
   "મને સીધો જવાબ મળ્યો નથી, પરંતુ ફાઇલમાં આને લગતી આ માહિતી છે: [અહીં ફાઇલની માહિતી ગુજરાતીમાં લખો]"
4. જો સંદર્ભમાં પ્રશ્નનો કોઈ જ જવાબ ન હોય, તો સ્પષ્ટ કહો: "માફ કરજો, અપલોડ કરેલી ફાઇલમાં આના વિશે કોઈ માહિતી નથી."

RELEVANT CONTEXT (કન્ટેક્સ્ટ):
{analyzed_context}

USER QUESTION (પ્રશ્ન):
{user_query}
"""
    else:
        return jsonify({"error": "Invalid action selected."}), 400

    try:
        response = ollama.generate(model=LOCAL_MODEL, prompt=prompt)
        return jsonify({
            "status": "success",
            "filename": uploaded_file.filename,
            "action_performed": action,
            "result": response['response']
        }), 200
    except Exception as e:
        return jsonify({"error": "LLM failed.", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)