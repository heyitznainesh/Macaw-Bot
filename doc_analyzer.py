import fitz  # PyMuPDF - much faster than PyPDF2
import docx
import re
import tempfile
import os

# In-memory cache to store extracted text
file_cache = {}

def get_text_from_any_file(file_storage):
    """Detects file type and extracts text quickly[cite: 1]."""
    filename = file_storage.filename
    
    # Return from cache if already processed[cite: 1]
    if filename in file_cache:
        return file_cache[filename], None

    try:
        if filename.lower().endswith('.pdf'):
            # PyMuPDF engine[cite: 1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                file_storage.save(tmp.name)
                doc = fitz.open(tmp.name)
                text = "".join([page.get_text() for page in doc])
                doc.close()
                os.remove(tmp.name)
        
        elif filename.lower().endswith('.docx'):
            # Word Doc processing[cite: 1]
            doc = docx.Document(file_storage.stream)
            text = "\n".join([para.text for para in doc.paragraphs])
        
        else:
            return None, "Unsupported file format."

        extracted_content = text.strip()
        file_cache[filename] = extracted_content
        return extracted_content, None

    except Exception as e:
        return None, f"Extraction Error: {str(e)}"

def get_relevant_context(full_text, query, max_chars=4000):
    """Finds the most relevant parts of the text based on keywords[cite: 1]."""
    paragraphs = [p.strip() for p in full_text.split('\n') if len(p.strip()) > 15]
    if not paragraphs:
        return full_text[:max_chars]

    query_words = set(re.findall(r'\w+', query.lower()))
    if not query_words:
        return "\n\n".join(paragraphs[:8])
    
    scored_chunks = []
    for p in paragraphs:
        p_words = set(re.findall(r'\w+', p.lower()))
        score = len(query_words.intersection(p_words))
        scored_chunks.append((score, p))
    
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    context = ""
    for _, chunk in scored_chunks:
        if len(context) + len(chunk) < max_chars:
            context += chunk + "\n\n"
        else:
            break
    return context
