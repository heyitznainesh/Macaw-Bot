# નખરા-લાલ - Smart Multi-Doc RAG Analyzer

A Gujarati-speaking AI document analyzer that extracts facts and answers questions across multiple documents.

## 🚀 Quick Start

### Current Status
✅ **Application is running in DEMO MODE** with mock Ollama API
- Status badge shows "Gemma-3 LoRA Active" (green)
- Mock LLM provides demo responses
- All UI features are functional

### Files in this Project
- `index.html` - Main application interface
- `script.js` - Core application logic
- `style.css` - Styling (Tailwind CSS CDN)
- `mock-ollama.js` - **Mock LLM server** (enables demo mode)
- `local_llm_server.py` - Python server for real LLM (optional)
- `mock-ollama-worker.js` - Service Worker mock (reference)

## 🔧 How to Run

### Option 1: Demo Mode (Current - No Installation Required)
The application is already running with a mock LLM. Open `index.html` in your browser:
```bash
# File protocol (automatic in browser)
file:///C:/Users/windows11/Desktop/Macaw/Macaw/index.html
```

Or start a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Using PowerShell
python -m http.server 8000
```

### Option 2: Full Functionality with Real Ollama (Recommended for Production)

#### Step 1: Install Ollama
1. Download from: https://ollama.ai
2. Run the installer
3. Restart your computer

#### Step 2: Pull Gemma Model
Open PowerShell and run:
```powershell
ollama pull gemma:2b
```

#### Step 3: Start Ollama Server
```powershell
ollama serve
```

This starts the server on `http://localhost:11434`

#### Step 4: Open Application
The app will automatically detect Ollama and use the real model.

### Option 3: Python LLM Server (Local)
```powershell
cd "C:\Users\windows11\Desktop\Macaw\Macaw"
pip install flask
python local_llm_server.py
```

Then open the application in your browser.

## � Voice Features (NEW!)

### Gujarati Text-to-Speech with Male Voice
- ✅ All bot responses are automatically spoken in Gujarati
- ✅ Male voice preference (system-dependent)
- ✅ Optimized pitch and rate for naturalness
- ✅ Console debugging and voice testing tools

### Quick Test:
1. Send a message - bot will respond and speak in Gujarati
2. Open browser console (F12) to see available voices
3. Run `testVoices()` to hear all available Gujarati voices
4. Run `testSpeak("તમારું નામ શું છે?")` to test custom text

See [VOICE_GUIDE.md](VOICE_GUIDE.md) for detailed voice documentation.

## �📚 Features

### Document Processing
- Upload PDF files
- Upload DOCX files  
- Upload TXT files
- Extract text and metadata
- Store documents in browser (IndexedDB)

### Chat Interface
- 🎤 Voice input (with speech recognition)
- 💬 Text input
- 🗣️ Bilingual responses (Gujarati + English)
- 🦜 Friendly Macaw mascot

### AI Capabilities (With Real Ollama)
- Multi-document analysis
- Fact extraction
- Question answering
- Document summarization
- Gujarati language support

## 🎯 Testing the Mock API

### Test Endpoints:

**Test "Hello":**
```
Input: "Hello"
Expected: Greeting from the bot
```

**Test "Macaw":**
```
Input: "Macaw"
Expected: Bot responds with listening mode message
```

**Test "Help":**
```
Input: "Help"
Expected: Bot explains document analysis features
```

## 📝 Configuration

### Ollama URL
Default: `http://localhost:11434`

To change:
1. Open the application
2. Look for Ollama settings (gear icon or settings button)
3. Modify the URL and test connection

### Model Selection
Default: `gemma:2b`

Available models:
- `gemma:2b` - Fast, lightweight
- `gemma` - Full Gemma model
- Other models can be added by pulling them with Ollama

## 🐛 Troubleshooting

### "Local Ollama Offline" Message
**Solution 1 (Demo Mode):** The app will still work with mock responses
**Solution 2 (Real Server):** 
- Install Ollama: https://ollama.ai
- Run: `ollama serve`
- Restart the application

### Fetch Error in Console
- Check browser console (F12)
- Verify localhost:11434 is accessible
- Try using the Python server instead

### Models Not Loading
- Run `ollama pull gemma:2b`
- Verify Ollama service is running
- Check network connectivity

## 📁 Project Structure
```
Macaw/
├── index.html              # Main app interface
├── script.js               # Application logic
├── style.css               # Styling
├── mock-ollama.js          # Mock API (intercepts fetch)
├── local_llm_server.py     # Python Flask server
├── mock-ollama-worker.js   # Service Worker mock
└── README.md              # This file
```

## 🔐 Privacy
- Documents stored locally in browser (IndexedDB)
- No data sent to cloud by default
- With real Ollama: All processing is local

## 💡 Tips

### For Development
- Use Chrome DevTools (F12) to inspect network calls
- Mock responses are in `mock-ollama.js` - customize them there
- Add more test responses by editing the `MOCK_RESPONSES` object

### For Production
- Install real Ollama with Gemma-3 LoRA
- Configure production server URL
- Set up HTTPS for security
- Consider adding authentication

## 📞 Support

### Issues
1. Check browser console for errors (F12)
2. Verify Ollama is running (if not using demo mode)
3. Clear browser cache and reload
4. Restart Ollama service

### Customization
- Edit `mock-ollama.js` to change demo responses
- Modify `style.css` for custom styling
- Edit `script.js` for application logic

## 🎓 Learning Resources

- Ollama: https://ollama.ai
- Gemma Model: https://ai.google.dev/
- RAG (Retrieval-Augmented Generation): https://arxiv.org/abs/2005.11401

---

**Status:** ✅ Working (Demo Mode)  
**Last Updated:** 2025-08-17  
**Model:** Gemma-3 LoRA (Mock)  
**Language:** Gujarati + English
