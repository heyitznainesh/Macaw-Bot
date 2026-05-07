import os
import io
from flask import Blueprint, request, jsonify, current_app
import ollama
import PyPDF2
import docx

doc_analyzer_bp = Blueprint('doc_analyzer', __name__)
# NOTE: See the advice below regarding the best model for Gujarati
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
    and passes it to the local Ollama instance for analysis and Gujarati translation.
    """
    # 1. Validate the Request
    action = request.form.get('action')
    file_url = request.form.get('file_url')
    uploaded_file = request.files.get('file') 

    text_to_process = ""

    if not action:
        return jsonify({"error": "Please provide an 'action'."}), 400

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

    # 3. Route the prompt based on the requested action with GUJARATI instructions
    if action == 'grammar':
        prompt = f"Review the following text for grammatical errors. Then, explain the errors and provide the corrected text COMPLETELY IN GUJARATI. Use Markdown. Provide the corrected text first under a '## Corrected Text' heading, followed by a '## Changes Made' heading with a bulleted list of your edits (all in Gujarati):\n\n{text_to_process}"

    elif action == 'summarize':
        prompt = f"""Summarize this text. 
        CRITICAL: The ENTIRE summary MUST be written in the GUJARATI language.
        You MUST use standard Markdown formatting. 
        - Use '## ' for headers.
        - Use '* ' for bullet points.
        - Use '**' for bold text.
        
        STRUCTURE:
        ## Executive Summary (Translate this header to Gujarati)
        [Paragraph in Gujarati]

        ## Key Takeaways (Translate this header to Gujarati)
        * **[Topic in Gujarati]:** [Explanation in Gujarati]

        TEXT:
        {text_to_process}"""

    elif action == 'key_concepts':
        prompt = f"Extract the top 5 most important academic concepts from the following text. The output MUST be entirely in GUJARATI. Format it as a list where each concept is **bolded**, followed by a clear, one-sentence definition in Gujarati:\n\n{text_to_process}"
        
    elif action == 'mcq_quiz':
        prompt = f"""
        Based on the following text, generate a 5-question Multiple Choice Quiz.
        CRITICAL: The questions, options, and answers MUST be written in GUJARATI. 
        However, the JSON keys (quiz, question, options, answer) MUST remain in English.
        
        Return STRICT JSON in this exact format:
        {{
            "quiz": [
                {{
                    "question": "[Gujarati question text here]",
                    "options": ["[Gujarati Option A]", "[Gujarati Option B]", "[Gujarati Option C]", "[Gujarati Option D]"],
                    "answer": "[Exact Gujarati text of the correct option]"
                }}
            ]
        }}
        TEXT: {text_to_process}
        """
        
    elif action == 'short_answer':
        prompt = f"""Based on the following text, generate 5 short-answer study questions with their corresponding model answers.
        CRITICAL: The questions and answers MUST be written in GUJARATI.
        
You MUST return the output ONLY as a valid JSON object using the exact schema below. Keep JSON keys in English. Do not include any markdown formatting or conversational text.

{{
  "questions": [
    {{
      "question": "[Question text in Gujarati]",
      "answer": "[Detailed model answer in Gujarati]"
    }}
  ]
}}

Text to process:
{text_to_process}"""    
        
    elif action == 'flashcards':
        prompt = f"""
        Extract the key concepts from the following text and create study flashcards.
        CRITICAL: The topics and descriptions MUST be written in GUJARATI.
        
        Return STRICT JSON in this exact format (keep keys in English):
        {{
            "flashcards": [
                {{ "topic": "[Concept name in Gujarati]", "description": "[Definition in Gujarati]" }}
            ]
        }}
        TEXT: {text_to_process}
        """    
    else:
        return jsonify({"error": "Invalid action selected."}), 400

    # 4. Call Local LLM
    try:
        response = ollama.generate(
            model=LOCAL_MODEL,
            prompt=prompt,
            # optional: format='json' # You can uncomment this if Ollama ignores the strict JSON instructions
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
