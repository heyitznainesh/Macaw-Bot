const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');
const fileList = document.getElementById('file-list');
const fileInput = document.getElementById('file-input');
let voices = [];
let documentParts = []; 

// =====================================
// DATA ARRAYS (Stories & Jokes)
// =====================================
const sadStories = [
    "હું તો બહુ ઉદાસ છું... ગઈકાલે જોરદાર વરસાદમાં મારો માળો ઝાડ પરથી નીચે પડી ગયો અને તૂટી ગયો હતો.",
    "હું બહુ દુઃખી છું. આજે મારો સૌથી સારો મિત્ર પોપટ બીજા જંગલમાં રહેવા જતો રહ્યો છે.",
    "મને આજે જરાય મજા નથી આવતી. મને આજે જમવામાં મારું મનપસંદ જામફળ મળ્યું જ નહીં.",
    "હું ઉદાસ છું. આજે આખો દિવસ વાદળછાયું વાતાવરણ રહ્યું અને મને બહુ ઠંડી લાગતી હતી."
];

const happyStories = [
    "પણ હું તો બહુ ખુશ છું! આજે મને જંગલમાં એક મોટું અને મીઠું સફરજન મળ્યું હતું, મેં મારા બધા મિત્રો સાથે મળીને ખાધું!",
    "હું તો આજે ખૂબ આનંદમાં છું! વરસાદ પછી મેં આકાશમાં સાત રંગનો સુંદર મેઘધનુષ્ય જોયો.",
    "મારી ખુશીનો પાર નથી! આજે મેં એક નવું અને સુંદર ગીત ગાતા શીખ્યું છે.",
    "વાહ, હું બહુ ખુશ છું! આજે મેં આકાશમાં સૌથી ઉંચી ઉડાન ભરી છે."
];

const jokesList = [
    "શિક્ષક: 'હું' અને 'તમે' કયો કાળ કહેવાય?\nવિદ્યાર્થી: સાહેબ, 'હું' એટલે ભૂતકાળ અને 'તમે' એટલે ભવિષ્યકાળ!\nશિક્ષક: કેવી રીતે?\nવિદ્યાર્થી: તમે ગયા વર્ષે પણ ભણાવતા હતા અને આવતા વર્ષે પણ ભણાવશો!",
    "દર્દી: ડોક્ટર સાહેબ, મને રોજ સપનામાં વાંદરાઓ ક્રિકેટ રમતા દેખાય છે.\nડોક્ટર: આ ગોળી લો, આજથી સપના બંધ.\nદર્દી: કાલથી લઉં તો ચાલશે? આજે ફાઇનલ મેચ છે!",
    "ચિન્ટુ: પપ્પા, મને એક નવો ફોન અપાવો ને!\nપપ્પા: તારો જૂનો ફોન ક્યાં છે?\nચિન્ટુ: એ તો ગેમ રમતા-રમતા હેંગ થઈ ગયો!\nપપ્પા: તો હવે તું પણ બે દિવસ હેંગ થઈ જા, નવો ફોન નહીં મળે!",
    "એક ભાઈએ ડોક્ટરને પૂછ્યું: સાહેબ, વજન ઓછું કરવા શું કરવું?\nડોક્ટર: રોજ 5 કિલોમીટર ચાલવું.\nએક મહિના પછી ભાઈનો ફોન આવ્યો: સાહેબ, હું તો ચાલતા-ચાલતા અમદાવાદ પહોંચી ગયો છું, હવે પાછો આવું?",
    "પત્ની: તમે મને કેટલી પ્રેમ કરો છો?\nપતિ: શાહજહાં જેટલો!\nપત્ની: તો મારા માટે તાજમહેલ ક્યારે બનાવશો?\nપતિ: મેં તો જમીન લઈ લીધી છે, બસ હવે તારા મરવાની રાહ જોઉં છું!"
];

let lastSadStoryIndex = -1;
let lastHappyStoryIndex = -1;
let lastJokeIndex = -1;

// =====================================
// HYBRID TEXT-TO-SPEECH
// =====================================
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

function speak(text) {
    const cleanText = text.replace(/[*#_`~]/g, ''); 
    const words = cleanText.split(' ');
    const chunks = [];
    let currentChunk = '';
    
    for(let word of words) {
        if((currentChunk + ' ' + word).length > 150) {
            chunks.push(currentChunk);
            currentChunk = word;
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + word : word;
        }
    }
    if(currentChunk) chunks.push(currentChunk);

    let currentChunkIndex = 0;
    let fallbackTriggered = false;

    function playNextChunk() {
        if (fallbackTriggered) return;
        if (currentChunkIndex >= chunks.length) return;
        
        const chunk = chunks[currentChunkIndex];
        const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=gu&client=gtx&q=${encodeURIComponent(chunk)}`;
        const audio = new Audio(url);
        
        audio.onended = () => {
            currentChunkIndex++;
            playNextChunk();
        };
        
        audio.onerror = () => triggerFallback();
        audio.play().catch(e => triggerFallback());
    }

    function triggerFallback() {
        if(!fallbackTriggered) {
            fallbackTriggered = true;
            fallbackSpeak(cleanText);
        }
    }

    if(window.speechSynthesis) window.speechSynthesis.cancel();
    if (chunks.length > 0) playNextChunk();
}

function fallbackSpeak(cleanText) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (voices.length === 0) voices = window.speechSynthesis.getVoices();

        let selectedVoice = voices.find(v => (v.lang === 'gu-IN' || v.lang === 'gu_IN') && v.name.includes('Google'));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang === 'gu-IN' || v.lang === 'gu_IN');
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('IN') && (v.name.includes('Female') || v.name.includes('Aditi')));

        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.lang = 'gu-IN'; 
        utterance.volume = 1.0; 
        utterance.pitch = 1.1;
        utterance.rate = 0.9; 
        
        window.speechSynthesis.speak(utterance);
    }, 50);
}

function unblockAudio() {
    const overlay = document.getElementById('audio-overlay');
    if (overlay) overlay.style.display = 'none';
    const welcome = "નમસ્તે! હું Macaw Bot છું.";
    appendMessage(welcome, 'bot');
    speak(welcome);
}

// =====================================
// UI CHAT FUNCTIONS
// =====================================
function appendMessage(text, sender) {
    const msg = document.createElement('div');
    if (sender === 'user') {
        msg.className = 'msg-bubble msg-user';
        msg.innerText = text;
    } else {
        const displayText = text.replace(/[*#_`~]/g, ''); 
        msg.className = 'msg-bubble msg-bot cursor-pointer hover:bg-slate-50 transition-colors flex justify-between items-start gap-3';
        msg.title = "સાંભળવા માટે ક્લિક કરો (Click to listen)";
        msg.onclick = () => speak(displayText);
        
        msg.innerHTML = `
            <span class="flex-1">${displayText}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 mt-1 flex-shrink-0 hover:text-[#fbbf24] transition-colors"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        `;
    }
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function botRespond(text, mood = 'react-neutral', statusText = 'Stable') {
    const birdSvg = document.getElementById('bird-svg');
    const statusEl = document.getElementById('bot-status');
    
    if (birdSvg) birdSvg.setAttribute('class', "parrot-svg " + mood);
    
    if (statusEl) {
        statusEl.innerText = "Status: " + statusText;
        statusEl.className = statusText === 'Reading' || statusText === 'Thinking...'
            ? "text-[#a855f7] text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors"
            : "text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors";
    }

    appendMessage(text, 'bot');
    speak(text);

    if (statusText === 'Reading') {
        setTimeout(() => {
            if (statusEl.innerText === "Status: Reading") {
                statusEl.innerText = "Status: Stable";
                statusEl.className = "text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors";
                birdSvg.setAttribute('class', "parrot-svg react-neutral");
            }
        }, 3500);
    }
}

// =====================================
// MESSAGE PROCESSING LOGIC
// =====================================
async function processMessage() {
    const val = userInput.value.trim();
    if (!val) return;

    appendMessage(val, 'user');
    const query = val.toLowerCase();
    userInput.value = "";

    let response = "";
    let mood = "react-neutral";
    let statusText = "Stable";

    if (query.includes("love") || query.includes("પ્રેમ") || query.includes("વહાલ")) {
        const loveStories = [
            "એકવાર એક નીલકંઠ પક્ષીને ગુલાબી મકાઉ સાથે પ્રેમ થઈ ગયો, તેઓ આખું આકાશ સાથે ઉડતા હતા!",
            "પ્રેમ એટલે જંગલના ફૂલોની મીઠી સુગંધ! મારી પાસે તમારા માટે ખૂબ જ વહાલ છે.",
            "મારી દુનિયામાં તો બસ પ્રેમ જ પ્રેમ છે! તમારી સાથે વાત કરીને મારું દિલ ભરાઈ આવ્યું."
        ];
        response = loveStories[Math.floor(Math.random() * loveStories.length)];
        mood = "react-pink"; 
    } 
    else if (query.includes("તુલસી") || query.includes("લીમડો") || query.includes("plant") || query.includes("ઝાડ") || query.includes("છોડ")) {
        mood = "react-green";
        if (query.includes("તુલસી") || query.includes("tulsi")) {
            response = "તુલસી એક અત્યંત પવિત્ર છોડ છે. તે આપણને શુદ્ધ ઓક્સિજન આપે છે અને ઔષધિઓની રાણી કહેવાય છે.";
        } else if (query.includes("લીમડો") || query.includes("neem")) {
            response = "લીમડો કડવો જરૂર છે, પણ તે કુદરતી એન્ટિસેપ્ટિક છે! તેના પાન લોહી શુદ્ધ કરવામાં ઉત્તમ છે.";
        } else {
            response = "ઝાડ-છોડ પૃથ્વીના ફેફસાં છે! જો આપણે છોડ વાવીશું, તો જ જંગલો અને પક્ષીઓ બચશે.";
        }
    }
    else if (query.includes("angry") || query.includes("ગુસ્સો") || query.includes("ખરાબ")) {
        const scoldings = [
            "તારી હિંમત કેવી રીતે થઈ મારી સાથે આવી રીતે વાત કરવાની?! મર્યાદામાં રહે!",
            "મને બહુ જ ગુસ્સો આવે છે! બસ હવે ચૂપ થઈ જા!",
            "ખબરદાર! મકાઉ બોટ સાથે પંગો લેવો મોંઘો પડશે, સમજી લેજે!"
        ];
        response = scoldings[Math.floor(Math.random() * scoldings.length)];
        mood = "react-red-shake"; 
    } 
    else if (query.includes("joke") || query.includes("જોક") || query.includes("રમુજ") || query.includes("હસવું")) {
        let newJokeIndex;
        do {
            newJokeIndex = Math.floor(Math.random() * jokesList.length);
        } while (newJokeIndex === lastJokeIndex);
        lastJokeIndex = newJokeIndex;
        response = jokesList[newJokeIndex];
        mood = "react-orange-giggle";
    }
    else if (query.includes("happy") || query.includes("ખુશ") || query.includes("મજા")) {
        let idx = Math.floor(Math.random() * happyStories.length);
        response = happyStories[idx];
        mood = "react-blue";
    } 
    else if (query.includes("sad") || query.includes("ઉદાસ") || query.includes("દુઃખ")) {
        let idx = Math.floor(Math.random() * sadStories.length);
        response = sadStories[idx];
        mood = "react-yellow"; 
    } 
    else if (query.includes("bye") || query.includes("આવજો")) {
        response = "આવજો મિત્ર, જલ્દી પાછા આવજો!";
        mood = "react-bye-pulse"; 
    } 
    else if (query.includes("date") || query.includes("તારીખ")) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        response = `આજની તારીખ ${now.toLocaleDateString('gu-IN', options)} છે.`;
    } 
    else if (documentParts.length > 0) {
        statusText = "Thinking...";
        const statusEl = document.getElementById('bot-status');
        if (statusEl) {
            statusEl.innerText = "Status: Thinking...";
            statusEl.className = "text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors";
        }
        
        try {
            const formData = new FormData();
            formData.append("action", "macaw_chat");
            formData.append("query", val);
            
            if (documentParts[0] && documentParts[0].rawFile) {
                formData.append("file", documentParts[0].rawFile);
            }

            const res = await fetch(`http://127.0.0.1:5000/api/ai/upload-and-analyze`, {
                method: 'POST',
                body: formData
            });
            
            const parsedData = await res.json();

            if (!res.ok || !parsedData.result) {
                throw new Error(parsedData.error || "Failed to get valid response.");
            }
            
            response = parsedData.result;
            statusText = "Stable";
            
        } catch (e) {
            console.error("Local LLM Query Failed:", e);
            response = "માફ કરજો, ઑફલાઇન સર્વર સાથે જોડાવામાં ભૂલ થઈ. સર્વર ચાલુ છે કે નહીં તે ચકાસો.";
            mood = "react-yellow";
            statusText = "Stable";
        }
    } else {
        response = "હા, મેં સાંભળ્યું. મારી પાસે અત્યારે કોઈ ફાઇલ નથી, શું તમે કોઈ ફાઇલ અપલોડ કરવા માંગો છો?";
    }

    botRespond(response, mood, statusText);
}

// =====================================
// OFFLINE SPEECH-TO-TEXT
// =====================================
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const micBtn = document.getElementById('mic-btn');

    if (isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove('bg-red-400', 'text-white', 'animate-pulse');
        micBtn.classList.add('bg-slate-200', 'text-slate-700');
        userInput.placeholder = "ટ્રાન્સક્રિપ્બ કરી રહ્યું છે... (Transcribing...)";
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        
        micBtn.classList.remove('bg-slate-200', 'text-slate-700');
        micBtn.classList.add('bg-red-400', 'text-white', 'animate-pulse');
        userInput.placeholder = "સાંભળી રહ્યો છું... (Click mic again to stop)";
        
    } catch (err) {
        console.error("Microphone access denied:", err);
        alert("માઇક્રોફોન ચાલુ કરવામાં ભૂલ. કૃપા કરીને બ્રાઉઝરમાં પરવાનગી આપો.");
    }
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/ai/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === "success" && data.text) {
            userInput.value = data.text;
            userInput.placeholder = "તમારો સંદેશ લખો...";
            processMessage(); 
        } else {
            throw new Error(data.error || "Transcription failed");
        }
    } catch (error) {
        console.error("Offline STT Error:", error);
        userInput.placeholder = "ટ્રાન્સક્રિપ્શન નિષ્ફળ ગયું (Failed).";
    }
}

// =====================================
// FILE UPLOAD LOGIC
// =====================================
function handleFiles(files) {
    [...files].forEach(file => {
        const item = document.createElement('div');
        item.className = 'text-xs text-slate-700 bg-slate-100 p-2 rounded border border-slate-200 mb-2 flex justify-between items-center';
        
        const fileText = document.createElement('span');
        fileText.className = 'truncate';
        fileText.innerText = `📄 ${file.name}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-slate-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0 focus:outline-none';
        removeBtn.title = "કાઢી નાખો (Remove)";
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        
        documentParts.push({ fileId: file.name, rawFile: file });
        botRespond(`${file.name} ફાઇલ સ્વીકારી લેવામાં આવી છે.`, 'react-reading', 'Reading');

        removeBtn.onclick = () => {
            item.remove();
            documentParts = documentParts.filter(p => p.fileId !== file.name);
            if (fileList.children.length === 0) {
                botRespond("બધી ફાઇલો કાઢી નાખવામાં આવી છે.", 'react-neutral', 'Stable');
            }
        };

        item.appendChild(fileText);
        item.appendChild(removeBtn);
        fileList.appendChild(item);
    });
    fileInput.value = ''; 
}

fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) handleFiles(this.files);
});

const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-slate-100'); 
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-slate-100'); 
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-slate-100'); 
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') processMessage(); });