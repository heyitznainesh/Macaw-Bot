import os
from flask import Blueprint, request, jsonify, current_app
import ollama
import PyPDF2
import docx

doc_analyzer_bp = Blueprint('doc_analyzer', __name__)

# NOTE: If gemma3:4b still sounds slightly robotic in Gujarati, 
# try changing this to 'aya' or 'llama3' for much more natural regional language support!
LOCAL_MODEL = 'gemma3:4b'

# ==========================================
# HELPER: Text Extraction
# ==========================================
def extract_text_from_file(file_storage):
    """
    Reads an uploaded file from memory and extracts text based on its extension.
    Returns the extracted text as a string.
    """
    filename = file_storage.filename.lower()
    extracted_text = ""

    try:
        if filename.endswith('.pdf'):
            # Read PDF in memory
            pdf_reader = PyPDF2.PdfReader(file_storage.stream)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
                    
        elif filename.endswith('.docx'):
            # Read DOCX in memory
            doc = docx.Document(file_storage.stream)
            for para in doc.paragraphs:
                extracted_text += para.text + "\n"
        else:
            return None, "Unsupported file format. Please upload a .pdf or .docx"
            
        return extracted_text.strip(), None
        
    except Exception as e:
        return None, f"Failed to parse file: {str(e)}"

# ==========================================
# ENDPOINT: Upload and Analyze
# ==========================================
@doc_analyzer_bp.route('/api/ai/upload-and-analyze', methods=['POST'])
def upload_and_analyze():
    """
    Accepts a file upload and an action, extracts the text, 
    and passes it to the local Ollama instance for natural Gujarati analysis.
    """
    # 1. Validate the Request
    action = request.form.get('action')
    file_url = request.form.get('file_url')
    uploaded_file = request.files.get('file')

    text_to_process = ""

    if not action:
        return jsonify({"error": "Please provide an 'action' (grammar, summarize, key_concepts, mcq_quiz, short_answer, flashcards)."}), 400

    # Scenario A: User uploaded a new file
    if uploaded_file and uploaded_file.filename != '':
        text_to_process, error = extract_text_from_file(uploaded_file)
        if error:
            return jsonify({"error": error}), 400

    # Scenario B: The teacher selected an existing file from the Resource Hub
    elif file_url:
        filename = file_url.split('/')[-1]
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        
        if os.path.exists(filepath):
            if filepath.lower().endswith('.pdf'):
                with open(filepath, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    text_to_process = "\n".join([page.extract_text() for page in pdf_reader.pages if page.extract_text()])
            elif filepath.lower().endswith('.docx'):
                doc = docx.Document(filepath)
                text_to_process = "\n".join([para.text for para in doc.paragraphs])
            else:
                return jsonify({"error": "Currently, AI Generation only supports PDFs and DOCX."}), 400
        else:
            return jsonify({"error": "File not found on server."}), 400
    
    else:
        return jsonify({"error": "No file uploaded or selected."}), 400

    # Final validation before sending to AI
    if not text_to_process or not text_to_process.strip():
        return jsonify({"error": "Could not extract any readable text from the document."}), 400

    # Optional: Truncate text if it's massively huge to prevent blowing out context window
    # text_to_process = text_to_process[:8000] 

    # ==========================================
    # 3. Route the prompt based on action
    # ==========================================
    if action == 'grammar':
        prompt = f"""You are a helpful, supportive, and encouraging writing coach. Review the following text for grammatical errors. 
        
Explain the errors gently and provide the corrected text COMPLETELY IN NATURAL GUJARATI. Speak to the user as a friendly mentor. Use Markdown. Provide the corrected text first under a '## Corrected Text' (translate to Gujarati) heading, followed by a '## Changes Made' (translate to Gujarati) heading with a bulleted list of your edits:

TEXT:
{text_to_process}"""

    elif action == 'summarize':
        prompt = f"""You are a friendly, encouraging, and expert tutor. Your goal is to explain concepts clearly and naturally to a student.
        
Please read the text below and provide a conversational, easy-to-understand summary. 
CRITICAL: The ENTIRE summary MUST be written in beautifully flowing, natural GUJARATI. Avoid rigid, machine-like translations. Use everyday Gujarati words where appropriate.

You MUST use standard Markdown formatting. 

STRUCTURE:
## Executive Summary (Translate to a friendly Gujarati header)
[Write a natural, conversational paragraph in Gujarati explaining the main idea, as if you are speaking directly to a student.]

## Key Takeaways (Translate to Gujarati)
* **[Topic in Gujarati]:** [Explain this point simply and naturally in Gujarati]

TEXT:
{text_to_process}"""

    elif action == 'key_concepts':
        prompt = f"""You are a knowledgeable teacher. Extract the top 5 most important academic concepts from the following text. 
        
The output MUST be entirely in fluent, natural GUJARATI. Format it as a list where each concept is **bolded**, followed by a clear, easy-to-understand one-sentence definition in Gujarati. Speak as if you are giving a student a helpful study sheet.

TEXT:
{text_to_process}"""
        
    elif action == 'mcq_quiz':
        prompt = f"""You are creating a fun and engaging quiz for a student based on the following text. Generate a 5-question Multiple Choice Quiz.
        
CRITICAL: The questions, options, and answers MUST be written in natural, fluent GUJARATI. 
However, the JSON keys (quiz, question, options, answer) MUST remain in English.

Return STRICT JSON in this exact format. Do not add markdown blocks outside the JSON:
{{
    "quiz": [
        {{
            "question": "[Engaging Gujarati question text here]",
            "options": ["[Gujarati Option A]", "[Gujarati Option B]", "[Gujarati Option C]", "[Gujarati Option D]"],
            "answer": "[Exact Gujarati text of the correct option]"
        }}
    ]
}}

TEXT: {text_to_process}
"""
        
    elif action == 'short_answer':
        prompt = f"""You are a thoughtful teacher creating a study guide. Based on the following text, generate 5 short-answer study questions with their corresponding model answers.
        
CRITICAL: 
1. The questions and answers MUST be written in natural, fluent GUJARATI. 
2. Write the answers as if you are explaining them clearly and warmly to a student.

You MUST return the output ONLY as a valid JSON object using the exact schema below. Keep JSON keys in English. Do not include any markdown formatting or conversational text outside the JSON.

{{
  "questions": [
    {{
      "question": "[Conversational question text in Gujarati]",
      "answer": "[Clear, naturally flowing model answer in Gujarati]"
    }}
  ]
}}

TEXT:
{text_to_process}"""    
        
    elif action == 'flashcards':
        prompt = f"""You are helping a student prepare for an exam. Extract the key concepts from the following text and create easy-to-digest study flashcards.
        
CRITICAL: The topics and descriptions MUST be written in natural, fluent GUJARATI so the student can understand them easily.

Return STRICT JSON in this exact format (keep keys in English). Do not add markdown blocks outside the JSON:
{{
    "flashcards": [
        {{ "topic": "[Concept name in Gujarati]", "description": "[Clear, simple definition in Gujarati]" }}
    ]
}}

TEXT: {text_to_process}
"""    
    else:
        return jsonify({"error": "Invalid action selected."}), 400

    # ==========================================
    # 4. Call Local LLM
    # ==========================================
    try:
        response = ollama.generate(
            model=LOCAL_MODEL,
            prompt=prompt
        )
        
        return jsonify({
            "status": "success",
            "filename": uploaded_file.filename if uploaded_file else filename,
            "action_performed": action,
            "result": response['response']
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to connect to local LLM or generate response.", 
            "details": str(e)
        }), 500
