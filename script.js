var boredomTimer = null;
var documents = [];
var recognition = null;
var isListening = false;
var currentAudio = null;
var isBotSpeaking = false;
var isStandby = true;
var autoRestartMic = true;
var ollamaAvailable = false;
var isRecognitionStartingOrRunning = false;

const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const birdSvg = document.getElementById('bird-svg');
const micBtn = document.getElementById('mic-btn');
const fileListDisplay = document.getElementById('file-list');
const fileInput = document.getElementById('file-input');
const botStatus = document.getElementById('bot-status');
const ollamaIndicator = document.getElementById('ollama-indicator');
const ollamaUrlInput = document.getElementById('ollama-url');
const ollamaModelInput = document.getElementById('ollama-model');
const docCounter = document.getElementById('doc-counter');

/* IndexedDB Database Helpers */
const dbName = "NakhraLalDB";
const storeName = "documents";
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "name" });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e.target.error);
    });
}

function saveDocToDB(doc) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(doc);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function deleteDocFromDB(name) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function loadAllDocsFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function clearAllDocsFromDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const req = tx.objectStore(storeName).clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function loadStoredDocuments() {
    try {
        await initDB();
        documents = await loadAllDocsFromDB();
        renderFileList();
    } catch (err) {
        console.error("IndexedDB initialization failed:", err);
    }
}

async function testOllamaConnection() {
    const baseUrl = ollamaUrlInput.value.trim();
    ollamaIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span> Testing...`;
    ollamaIndicator.className = "flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-full border border-orange-200 text-xs font-semibold";
    
    try {
        const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
        if (res.ok) {
            ollamaAvailable = true;
            ollamaIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500"></span> Gemma-3 LoRA Active`;
            ollamaIndicator.className = "flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-semibold";
        } else {
            throw new Error("Offline");
        }
    } catch (e) {
        ollamaAvailable = false;
        ollamaIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> Local Ollama Offline`;
        ollamaIndicator.className = "flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200 text-xs font-semibold";
    }
}

window.addEventListener('load', async () => {
    await loadStoredDocuments();
    await testOllamaConnection();
});

const botMemory = {
    identity: {
        intro: "નમસ્તે! મારું નામ નખરા-લાલ છે. હું તમારો સ્માર્ટ ગુજરાતી મિત્ર છું!",
        birth: "મારો જન્મ ૨૦૨૫ માં ફ્લોરિડાના લેકલેન્ડમાં થયો હતો.",
        location: "હું ફ્લોરિડાના લેકલેન્ડમાં રહું છું, પણ મારું હૃદય હંમેશા ગુજરાતમાં છે!",
        hobbies: "મારા શોખ: ચેસ રમવી, વન્યજીવ સંરક્ષણ અને ગરબા કરવા!",
        mission: "મારું મિશન છે કે શિક્ષણમાં હાસ્ય ભળેલું હોય અને સંસ્કૃતિ એક ઉત્સવ જેવી લાગે. પ્રશ્નો જ પ્રગતિની ચાવી છે!"
    },
    system: {
        status: "હું માત્ર બોટ નથી, હું તમારી સ્માર્ટ મિત્ર છું!",
        bye: "આવજો! પંખીડાં ફરી મળશે, તમારું ધ્યાન રાખજો!"
    },
    modes: {
        nature: "પ્રકૃતિ એ ઈશ્વરની સૌથી સુંદર કલા છે. વૃક્ષો, નદીઓ અને પર્વતો આપણને શાંતિ આપે છે. જંગલો પૃથ્વીના ફેફસાં છે.",
        tech: "ટેકનોલોજી દુનિયાને બદલી રહી છે. AI હવે ભવિષ્યનો પાયો છે. નવી ટેકનોલોજી શીખતા રહો, એ જ સાચો રસ્તો છે.",
        business: "અમીર બનવા માટે સ્માર્ટ વર્ક અને યોગ્ય રોકાણ જરૂરી છે. હંમેશા 'પૈસા વસૂલ' અને 'નૈતિક વેપારી બુદ્ધિ' વાપરો."
    },
    emotions: {
        happy: [
            "આજે મારું મન ખુશીથી નાચી રહ્યું છે! તમારી સાથે વાત કરીને આનંદ થયો.",
            "ચલો, આજે આપણે કંઈક ઉજવણી કરીએ! વાહ!",
            "વાહ! આજે તો આખો દિવસ સોના જેવો ઉજ્જવળ લાગે છે!"
        ],
        sad: [
            "મારું હૃદય આજે થોડું ઉદાસ છે, મને બહુ સારું નથી લાગતું.",
            "જીવન ક્યારેક થોડું અઘરું બની જાય છે, હે ને?",
            "આજે વાદળો પણ ગંભીર લાગે છે, અને મારી આંખોમાં પણ થોડી ઉદાસી છે."
        ],
        love: [
            "તમે મારા સૌથી શ્રેષ્ઠ મિત્ર છો! તમારી મિત્રતા અમૂલ્ય છે. ❤️",
            "તમારી સાથે વાત કરીને મારું હૃદય ખુશ થઈ જાય છે!",
            "દુનિયા ગમે તેવી હોય, પણ તમારો સાથ બહુ મીઠો લાગે છે. ❤️"
        ],
        love_story: [
            "એક નાનકડા સુંદર ગામમાં રોહન અને આરાધ્યા રહેતા હતા. તેઓ રોજ સાંજે નદી કિનારે મળતા. બંને વચ્ચે કોઈ મોટા વચનો નહોતા, બસ એકબીજાના મનની વાત સમજી લેવી એ જ તેમનો અસલી પ્રેમ હતો. સમય વિતતો ગયો અને તેમની આ વાર્તા એક અમર પ્રેમ કહાની બની ગઈ.",
            "વરસાદની એક ખુશનુમા સાંજે, કબીર અગાસીમાં ચા પી રહ્યો હતો. અચાનક સામેની અગાસીમાં ઉભેલી મીરા પર તેની નજર પડી. ચાની ચુસ્કીઓ અને વરસાદના ફોરાં વચ્ચે શરૂ થયેલી એ મુલાકાત આજે એક અદ્ભુત લવ સ્ટોરી બની ગઈ છે."
        ],
        scary_story: [
            "એક ગાઢ અંધારી રાતે, વિવેક જંગલમાંથી પસાર થઈ રહ્યો હતો. અચાનક તેને એક જૂની હવેલી દેખાઈ. હવેલીની બારીમાંથી ઝાંખો દીવો બળતો હતો. જાવું કે ના જાવું એ વિચારતા જ દરવાજો પોતે જ ખુલ્યો! અંદર એક જૂનો પિયાનો પોતાની મેળે વાગી રહ્યો હતો. વિવેકે પાછળ ફરીને જોયું તો દરવાજો બંધ થઈ ગયો હતો અને સામે એક પડછાયો ઉભો હતો..."
        ],
        drama_story: [
            "રાજમહેલમાં આયોજિત સભામાં એક રહસ્યમય કાગળ આવ્યો. રાજાએ દરબારીઓને પૂછ્યું કે આ નકશો કોનો છે? અચાનક સેનાપતિ આગળ આવ્યા અને બોલ્યા, 'આ નકશો આપણા સામ્રાજ્યના ગુપ્ત ખજાનાનો છે જે સો વર્ષ પહેલાં ખોવાઈ ગયો હતો.' આ સાંભળતા જ આખા દરબારમાં સન્નાટો છવાઈ ગયો!"
        ],
        joke: [
            "શિક્ષક: 'હું' અને 'તમે' કયો કાળ કહેવાય? <br>વિદ્યાર્થી: સાહેબ, 'હું' એટલે ભૂતકાળ અને 'તમે' એટલે ભવિષ્યકાળ!",
            "ચિન્ટુ: પપ્પા, નવો ફોન અપાવો ને! પપ્પા: જૂનો ક્યાં છે? <br>ચિન્ટુ: એ ગેમ રમતા હેંગ થઈ ગયો અને મેં તોડી નાખ્યો!"
        ],
        jealous: [
            "{bot} ભલે ગમે તેટલું સ્માર્ટ હોય, પણ {bot} પાસે આપણો ગુજરાતી મિજાજ ક્યાં છે? તો મારા પર જ ધ્યાન આપો!",
            "{bot} ના નામ લઈને મને ઈર્ષ્યા ન અપાવો, હું રિસાઈ જઈશ તો મનાવવી બહુ અઘરી પડશે!"
        ],
        bored: [
            "નખરા-લાલ હવે કંટાળાથી પાંખો ખંખેરી રહી છે. જલ્દી કંઈક બોલો!"
        ]
    }
};

const usedIndices = { happy: [], sad: [], love: [], love_story: [], scary_story: [], drama_story: [], joke: [], jealous: [], bored: [] };

function getNextResponse(emotionKey) {
    const pool = botMemory.emotions[emotionKey];
    if (!pool || pool.length === 0) return "";
    if (!usedIndices[emotionKey]) usedIndices[emotionKey] = [];
    let available = pool.map((_, i) => i).filter(i => !usedIndices[emotionKey].includes(i));
    if (available.length === 0) {
        usedIndices[emotionKey] = [];
        available = pool.map((_, i) => i);
    }
    const randomIndex = available[Math.floor(Math.random() * available.length)];
    usedIndices[emotionKey].push(randomIndex);
    return pool[randomIndex];
}

/* --- AUTOMATIC GUJARATI TRANSLATOR ENGINE --- */
const SmartTranslator = {
    async translateToGujarati(text) {
        if (!text || text.trim() === '') return text;
        const gujMatches = text.match(/[\u0A80-\u0AFF]/g);
        if (gujMatches && gujMatches.length > text.length * 0.25) return text;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=gu&dt=t&q=${encodeURIComponent(text.substring(0, 3500))}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data[0]) {
                return data[0].map(item => item[0]).join('');
            }
        } catch (e) {
            console.warn("Translation fallback used original text", e);
        }
        return text;
    }
};

/* --- ENHANCED MULTI-DOCUMENT RAG ANALYZER ENGINE --- */
const MultiDocRAG = {
    stopWords: new Set(['the', 'is', 'are', 'was', 'were', 'for', 'and', 'but', 'this', 'that', 'છે', 'અને', 'પણ', 'માટે', 'હું', 'તમે', 'તે', 'આ', 'તો', 'કે', 'થી', 'ને', 'માં']),

    tokenize(text) {
        return text.toLowerCase().replace(/[^\w\u0A80-\u0AFF\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !this.stopWords.has(w));
    },

    chunkText(text, docName, chunkSize = 700, overlap = 120) {
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            const chunk = text.substring(start, end).trim();
            if (chunk.length > 15) {
                chunks.push({ text: chunk, docName: docName });
            }
            start += (chunkSize - overlap);
        }
        return chunks;
    },

    search(query, topK = 5) {
        if (documents.length === 0) return [];
        const queryTokens = this.tokenize(query);
        if (queryTokens.length === 0) return [];

        let allChunks = [];
        documents.forEach(doc => {
            const chunks = this.chunkText(doc.text, doc.name);
            allChunks.push(...chunks);
        });

        const scored = allChunks.map(chunk => {
            const chunkTokens = this.tokenize(chunk.text);
            let matched = 0;
            let score = 0;

            queryTokens.forEach(qToken => {
                const count = chunkTokens.filter(t => t === qToken).length;
                if (count > 0) {
                    matched++;
                    score += count * (/\d+/.test(qToken) ? 3.5 : 1.2);
                }
            });

            const coverage = matched / queryTokens.length;
            score *= (1 + coverage * 2.5);

            return { ...chunk, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.filter(s => s.score > 0).slice(0, topK);
    }
};

function triggerExitFlight(callback) {
    const targetContainer = document.querySelector('.avatar-container');
    const targetRect = targetContainer ? targetContainer.getBoundingClientRect() : { left: 100, top: 100 };
    const staticBird = document.getElementById('bird-svg');
    if (staticBird) staticBird.style.opacity = '0';

    const startX = targetRect.left;
    const startY = targetRect.top;
    const endX = window.innerWidth + 100;
    const endY = window.innerHeight * 0.35;

    const flyingBird = document.createElement('div');
    flyingBird.className = 'flying-bird-out-animation';
    flyingBird.style.setProperty('--startX', `${startX}px`);
    flyingBird.style.setProperty('--startY', `${startY}px`);
    flyingBird.style.setProperty('--endX', `${endX}px`);
    flyingBird.style.setProperty('--endY', `${endY}px`);
    flyingBird.style.width = '120px';
    flyingBird.style.height = '120px';

    flyingBird.innerHTML = `
        <svg viewBox="0 0 115 100" class="w-full h-full">
            <g transform="scale(-1, 1) translate(-115, 0)">
                <circle cx="45" cy="55" r="22" fill="#ef4444" />
                <circle cx="70" cy="40" r="20" fill="#ef4444" />
                <circle cx="76" cy="36" r="8" fill="white" />
                <circle cx="78" cy="36" r="3.5" fill="black" />
                <path class="wing-flap-active" d="M 45 50 C 30 10, 5 20, 38 48 Z" fill="#3b82f6" />
            </g>
        </svg>`;
    document.body.appendChild(flyingBird);

    setTimeout(() => {
        flyingBird.remove();
        if (callback) callback();
    }, 1300);
}

function initializeBot() {
    getAudioContext();
    const targetContainer = document.querySelector('.avatar-container');
    const targetRect = targetContainer.getBoundingClientRect();
    const staticBird = document.getElementById('bird-svg');
    staticBird.style.opacity = '0';

    const flyingBird = document.createElement('div');
    flyingBird.className = 'flying-bird-animation';
    flyingBird.style.setProperty('--startX', `${window.innerWidth + 100}px`);
    flyingBird.style.setProperty('--startY', `${window.innerHeight * 0.35}px`);
    flyingBird.style.setProperty('--endX', `${targetRect.left}px`);
    flyingBird.style.setProperty('--endY', `${targetRect.top}px`);
    flyingBird.style.width = '120px';
    flyingBird.style.height = '120px';

    flyingBird.innerHTML = `
        <svg viewBox="0 0 115 100" class="w-full h-full">
            <g transform="scale(-1, 1) translate(-115, 0)">
                <circle cx="45" cy="55" r="22" fill="#ef4444" />
                <circle cx="70" cy="40" r="20" fill="#ef4444" />
                <circle cx="76" cy="36" r="8" fill="white" />
                <circle cx="78" cy="36" r="3.5" fill="black" />
                <path class="wing-flap-active" d="M 45 50 C 30 10, 5 20, 38 48 Z" fill="#3b82f6" />
            </g>
        </svg>`;
    document.body.appendChild(flyingBird);

    const overlay = document.getElementById('audio-overlay');
    overlay.classList.add('fade-out-overlay');

    setTimeout(() => {
        flyingBird.remove();
        staticBird.style.opacity = '1';
        overlay.style.display = 'none';
        botRespond("નમસ્તે! મારું નામ નખરા-લાલ છે.", "happy");
    }, 1300);
}

async function queryOllamaMultiDoc(contextSnippets, query) {
    const baseUrl = ollamaUrlInput.value.trim();
    const modelName = ollamaModelInput.value.trim();
    const endpoint = `${baseUrl}/api/chat`;

    let contextText = contextSnippets.map(c => `[ફાઇલ: ${c.docName}]\n${c.text}`).join('\n\n');

    let systemPrompt = `તમે "નખરા-લાલ" છો - એક અત્યંત સચોટ અને સ્માર્ટ RAG Document Analyzer.
તમારે નીચે આપેલા સંદર્ભ (Uploaded Context) માંથી જ સચોટ જવાબ શોધવાનો છે.

કડક નિયમો:
૧. જવાબ ફક્ત આપેલા દસ્તાવેજોમાં આપેલી માહિતી પર આધારિત હોવો જોઈએ અને શુદ્ધ ગુજરાતી ભાષામાં સચોટ આપવો.
૨. કઈ ફાઈલમાંથી જવાબ મળ્યો તે ફાઈલનું નામ જણાવો (દા.ત. "[ફાઈલ: filename.pdf]").
૩. જો પ્રશ્નનો જવાબ આપેલા દસ્તાવેજોમાં ન હોય, તો સ્પષ્ટ રીતે કહો: "અરેરે! આ વિગત આપેલા દસ્તાવેજોમાં ક્યાંય નથી."`;

    let promptText = `સંદર્ભ માહિતી (Context):
${contextText}

પ્રશ્ન: ${query}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptText }
            ],
            stream: false,
            options: { temperature: 0.1 }
        })
    });

    if (!response.ok) throw new Error("Ollama connection failed");
    const data = await response.json();
    const rawAnswer = data.message.content.trim();
    return await SmartTranslator.translateToGujarati(rawAnswer);
}

async function processAI(query) {
    resetBoredomTimer();

    // 1. Check Goodbye / Exit Trigger
    if (query.match(/\b(bye|goodbye|good bye|tata|આવજો|બાય|જાવ છું)\b/i)) {
        const byeMessage = "આવજો! તમારો દિવસ શુભ રહે! પંખીડાં ફરી મળશે, તમારું ધ્યાન રાખજો!";
        return botRespond(byeMessage, "sad", () => {
            triggerExitFlight(() => {
                const overlay = document.getElementById('audio-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    overlay.offsetHeight;
                    overlay.classList.remove('fade-out-overlay');
                }
                const staticBird = document.getElementById('bird-svg');
                if (staticBird) staticBird.style.opacity = '1';
            });
        });
    }

    // 2. Check Rival Mention (Jealousy)
    const rivalMatch = query.match(/\b(alexa|siri|chatgpt|gpt|gemini|claude|copilot)\b/i);
    if (rivalMatch) {
        const jealousMsg = getNextResponse("jealous").replace(/\{bot\}/g, rivalMatch[1]);
        return botRespond(jealousMsg, "jealous");
    }

    // 3. Check Greetings & Identity
    if (query.match(/\b(hello|hi|hey|નમસ્તે|હાય|હેલો|કેમ છો|kem chho|halo)\b/i)) {
        return botRespond("નમસ્તે! મારું નામ નખરા-લાલ છે. હું તમારો સ્માર્ટ ગુજરાતી મિત્ર છું!", "happy");
    }

    if (query.match(/મિશન|mission/i)) {
        return botRespond(botMemory.identity.mission, "happy");
    }

    if (query.match(/જન્મ|born|birth/i)) {
        return botRespond(botMemory.identity.birth, "happy");
    }

    if (query.match(/ક્યાં રહો|location|stay|live|ક્યાં રહે|ક્યાંથી/i)) {
        return botRespond(botMemory.identity.location, "happy");
    }

    if (query.match(/શોખ|hobbies|hobby|રસ/i)) {
        return botRespond(botMemory.identity.hobbies, "happy");
    }

    if (query.match(/તમારા વિશે|કોણ છો|તમારું નામ|who are you|about yourself|તમારો પરિચય|પરિચય|તારું નામ/i)) {
        return botRespond(botMemory.identity.intro, "happy");
    }

    // 4. Check Stories & Emotions (Works dynamically WITH or WITHOUT uploaded files)
    if (query.match(/scary|horror|ડરામણી|ભૂત|બીક|ડર|ghost/i)) return botRespond(getNextResponse("scary_story"), "drama");
    if (query.match(/drama|નાટક|નાટકીય/i)) return botRespond(getNextResponse("drama_story"), "drama");
    if (query.match(/love story|પ્રેમ કહાની|પ્રેમ વાર્તા|પ્રેમકથા|romantic|રોમેન્ટિક/i)) return botRespond(getNextResponse("love_story"), "love");
    if (query.match(/happy|ખુશ|આનંદ|મજા|હસવું|smile|joy|glad/i)) return botRespond(getNextResponse("happy"), "happy");
    if (query.match(/sad|ઉદાસ|દુઃખ|દુખ|રડવું|cry|depressed|unhappy|દર્દ/i)) return botRespond(getNextResponse("sad"), "sad");
    if (query.match(/love|પ્રેમ|વ્હાલ|સ્નેહ|મિત્ર|દોસ્ત|friend|care|પ્યાર/i)) return botRespond(getNextResponse("love"), "love");
    if (query.match(/joke|જોક|રમૂજ|ચૂટકલો|હસાવો|funny|laugh|chutkula/i)) return botRespond(getNextResponse("joke"), "joke");
    if (query.match(/angry|ગુસ્સો|ખીજાવું|ક્રોધ|mad|furious/i)) return botRespond("અરેરે! શાંત થાઓ દોસ્ત! ગુસ્સો કરવાથી કંઈ નહીં વળે, ચલો સ્મિત કરો! 😊", "angry");
    if (query.match(/nature|પ્રકૃતિ|કુદરત|પર્યાવરણ|જંગલ|વૃક્ષ|નદી/i)) return botRespond(botMemory.modes.nature, "nature");
    if (query.match(/tech|ટેકનોલોજી|ટેક|કમ્પ્યુટર|ai|રોબોટ|વિજ્ઞાન/i)) return botRespond(botMemory.modes.tech, "tech");
    if (query.match(/business|વેપાર|ધંધો|અમીર|પૈસા|રોકાણ|money|wealth/i)) return botRespond(botMemory.modes.business, "business");

    // 5. Check Document Knowledge Base if available
    if (documents.length > 0) {
        botStatus.innerText = "બધા દસ્તાવેજોમાંથી જવાબ શોધી રહ્યો છું...";
        const matches = MultiDocRAG.search(query, 5);

        if (matches.length > 0) {
            if (ollamaAvailable) {
                try {
                    const answer = await queryOllamaMultiDoc(matches, query);
                    botStatus.innerText = "Stable";
                    return botRespond(answer, "happy");
                } catch (e) {
                    console.warn("Ollama fallback", e);
                }
            }

            const topSources = [...new Set(matches.map(m => m.docName))];
            const translatedSnippets = await SmartTranslator.translateToGujarati(matches.map(m => m.text).join('<br><br>'));
            const fallbackAnswer = `<b>📄 સ્રોત ફાઇલો: ${topSources.join(', ')}</b><br><br>` + translatedSnippets;
            botStatus.innerText = "Stable";
            return botRespond(fallbackAnswer, "happy");
        }
    }

    // 6. Default Fallback when no document matches or no document uploaded
    if (documents.length === 0) {
        botRespond("નમસ્તે! મારું નામ નખરા-લાલ છે. હું તમારી વાતો સમજી રહ્યો છું! જો તમારી પાસે કોઈ દસ્તાવેજ (PDF/DOCX) હોય તો તેને બાજુમાં અપલોડ કરો, જેથી હું તેમાંથી સાચા જવાબો આપી શકું.", "happy");
    } else {
        botRespond("અરેરે! આ વિગત આપેલા દસ્તાવેજોમાં ક્યાંય નથી મળતી. કોઈ બીજો પ્રશ્ન પૂછો!", "sad");
    }
}

function botRespond(text, mood = 'neutral', onEnd = null) {
    const cleanMood = mood.replace(/^react-|^mood-/, '');
    const tear = document.getElementById('emoticon-tear');
    if (tear) {
        tear.style.display = (cleanMood === 'sad') ? 'block' : 'none';
    }

    if (birdSvg) {
        birdSvg.className.baseVal = `macaw-svg-custom w-full h-full react-${cleanMood} mood-${cleanMood}`;
    }
    appendMsg(text, 'bot');
    speak(text, onEnd, cleanMood);
}

/* --- GUARANTEED MULTI-TIER GUJARATI AUDIO & SPEECH ENGINE --- */

let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

// Global speech state
let speechVoices = [];
let currentAudioPlayer = null;
let isAudioCanceled = false;
window._activeUtterance = null;

// Phonetic transliteration dictionary for English TTS voice fallback
const GujaratiPhonetics = {
    commonWords: {
        'નમસ્તે': 'Namaste',
        'નખરા-લાલ': 'Nakhra-Laal',
        'નખરાલાલ': 'Nakhra-Laal',
        'મારું': 'Maaru',
        'નામ': 'naam',
        'છે': 'chhe',
        'હું': 'Hoon',
        'તમારો': 'tamaaro',
        'તમારું': 'tamaaru',
        'તમે': 'tame',
        'મિત્ર': 'mitra',
        'દોસ્ત': 'dost',
        'છું': 'chhoon',
        'કેમ': 'Kem',
        'છો': 'chho',
        'આવજો': 'Aavjo',
        'હા': 'Haa',
        'ના': 'Naa',
        'સારું': 'Saaru',
        'ખુશ': 'Khush',
        'ઉદાસ': 'Udaas',
        'દસ્તાવેજ': 'Dastaavej',
        'દસ્તાવેજો': 'Dastaavejo',
        'ફાઇલ': 'File',
        'ફાઇલો': 'Files',
        'વાત': 'Vaat',
        'પ્રશ્ન': 'Prashna',
        'જવાબ': 'Jawaab',
        'જવાબો': 'Jawaabo',
        'સાચો': 'Saacho',
        'ધન્યવાદ': 'Dhanyavaad',
        'શુભ': 'Shubh',
        'દિવસ': 'Diwas',
        'આજે': 'Aaje',
        'ગુજરાતી': 'Gujarati',
        'સ્માર્ટ': 'Smart',
        'મિત્રતા': 'Mitrata',
        'સાચવવામાં': 'Saachvavama',
        'આવી': 'Aavi',
        'કાઢી': 'Kaadhi',
        'નાખી': 'Naakhi',
        'ઊભા રહો': 'Oobhaa raho',
        'જરા': 'Jaraa',
        'પહેલાં': 'Pahelaa',
        'પૂરી': 'Poori',
        'થવા દો': 'thavaa do',
        'સ્પેમ': 'spam',
        'શાંતિ રાખો': 'Shaanti raakho',
        'બોલી લેવા દો': 'Boli levaa do',
        'વારંવાર': 'Vaaramvaar',
        'ધીરજ રાખો': 'Dheeraj raakho',
        'પૂરું કરવા દો': 'Pooru karvaa do',
        'ન કરો': 'na karo'
    },
    charMap: {
        'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'ઋ': 'ru',
        'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'અં': 'an', 'અઃ': 'ah',
        'ક': 'ka', 'ખ': 'kha', 'ગ': 'ga', 'ઘ': 'gha',
        'ચ': 'cha', 'છ': 'chha', 'જ': 'ja', 'ઝ': 'jha',
        'ટ': 'ta', 'ઠ': 'tha', 'ડ': 'da', 'ઢ': 'dha', 'ણ': 'na',
        'ત': 'ta', 'થ': 'tha', 'દ': 'da', 'ધ': 'dha', 'ન': 'na',
        'પ': 'pa', 'ફ': 'fa', 'બ': 'ba', 'ભ': 'bha', 'મ': 'ma',
        'ય': 'ya', 'ર': 'ra', 'લ': 'la', 'ળ': 'la', 'વ': 'va',
        'શ': 'sha', 'ષ': 'sha', 'સ': 'sa', 'હ': 'ha',
        'ા': 'aa', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ૃ': 'ru',
        'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'n', 'ઃ': 'h',
        '્': '', 'ૉ': 'o', 'ૅ': 'e'
    },
    toPhonetic(text) {
        if (!text) return '';
        let res = text;
        for (const [w, p] of Object.entries(this.commonWords)) {
            res = res.split(w).join(p);
        }
        let output = '';
        for (let i = 0; i < res.length; i++) {
            const ch = res[i];
            if (this.charMap[ch]) {
                output += this.charMap[ch];
            } else {
                output += ch;
            }
        }
        return output.replace(/\s+/g, ' ').trim();
    }
};

function loadSpeechVoices() {
    if (!window.speechSynthesis) return;
    speechVoices = window.speechSynthesis.getVoices() || [];
    logAvailableVoices();
}

function logAvailableVoices() {
    if (speechVoices.length === 0) return;
    
    console.log('%c=== 📢 SPEECH ENGINE VOICES ===', 'color: #0066cc; font-weight: bold;');
    const gujaratiVoices = speechVoices.filter(v => /gu|gu-IN/i.test(v.lang));
    const hindiVoices = speechVoices.filter(v => /hi|hi-IN/i.test(v.lang));
    
    if (gujaratiVoices.length > 0) {
        console.log(`%c✓ Found ${gujaratiVoices.length} native Gujarati voice(s)`, 'color: #00cc00; font-weight: bold;');
    } else if (hindiVoices.length > 0) {
        console.log(`%c✓ Found ${hindiVoices.length} Indic voice(s) for clear pronunciation`, 'color: #0088cc;');
    } else {
        console.log('%c🌐 Using Cloud Gujarati Audio Stream for fluent Gujarati speech', 'color: #ff6600;');
    }
}

function hasNativeGujaratiVoice() {
    if (!speechVoices || speechVoices.length === 0) return false;
    return speechVoices.some(v => /gu|gu-IN|gujarati/i.test(v.lang || v.name));
}

function findBestSpeechVoice() {
    if (!speechVoices || speechVoices.length === 0) return null;
    
    // Priority 1: Gujarati voice
    const gujarati = speechVoices.find(v => /gu|gu-IN|gujarati/i.test(v.lang || v.name));
    if (gujarati) return { voice: gujarati, type: 'gujarati' };
    
    // Priority 2: Hindi/Indic voice (pronounces Gujarati text with natural Indian phonemes)
    const hindi = speechVoices.find(v => /hi|hi-IN|hindi|madhur|swara/i.test(v.lang || v.name));
    if (hindi) return { voice: hindi, type: 'hindi' };
    
    // Priority 3: Indian English voice
    const indianEnglish = speechVoices.find(v => /en-IN|india|ravi|heera/i.test(v.lang || v.name));
    if (indianEnglish) return { voice: indianEnglish, type: 'indian-english' };
    
    // Priority 4: System default
    return { voice: speechVoices[0] || null, type: 'default' };
}

window.speechSynthesis?.addEventListener('voiceschanged', loadSpeechVoices);
setTimeout(loadSpeechVoices, 300);

// Gentle, subtle sound helper (optional, non-blocking)
function generateMacawChirp() {
    return 0; // Speech speaks directly without loud synthetic buzzes
}

function playMacawSound() {
    return 0; // Immediate speech start
}

// Stop any currently running speech or audio
function stopCurrentAudio() {
    isAudioCanceled = true;
    if (currentAudioPlayer) {
        try {
            currentAudioPlayer.pause();
            currentAudioPlayer.currentTime = 0;
            currentAudioPlayer.src = '';
        } catch (e) {}
        currentAudioPlayer = null;
    }
    if (window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
    }
    window._activeUtterance = null;
}

// Split text into natural Gujarati sentences / clauses for smooth playback
function splitTextIntoGujaratiChunks(text, maxChunkLen = 140) {
    if (!text) return [];
    const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
    const chunks = [];

    for (let s of sentences) {
        s = s.trim();
        if (!s) continue;
        if (s.length <= maxChunkLen) {
            chunks.push(s);
        } else {
            const words = s.split(/([,;:\s]+)/);
            let current = '';
            for (let w of words) {
                if ((current + w).length <= maxChunkLen) {
                    current += w;
                } else {
                    if (current.trim()) chunks.push(current.trim());
                    current = w;
                }
            }
            if (current.trim()) chunks.push(current.trim());
        }
    }
    return chunks.length > 0 ? chunks : [text];
}

// Play Gujarati audio stream using Google TTS (authentic Gujarati speech)
function playGujaratiAudioStream(cleanText, onEnd = null, mood = 'neutral') {
    stopCurrentAudio();
    isAudioCanceled = false;
    isBotSpeaking = true;
    botStatus.innerText = "🦜 Macaw Speaking...";

    const chunks = splitTextIntoGujaratiChunks(cleanText, 140);
    if (chunks.length === 0) {
        isBotSpeaking = false;
        botStatus.innerText = "Stable";
        if (onEnd) onEnd();
        safeStartRecognition();
        return;
    }

    let chunkIndex = 0;

    function playNextChunk() {
        if (isAudioCanceled) {
            isBotSpeaking = false;
            botStatus.innerText = "Stable";
            return;
        }

        if (chunkIndex >= chunks.length) {
            isBotSpeaking = false;
            botStatus.innerText = "Stable";
            console.log('✅ Gujarati speech audio complete');
            if (onEnd) onEnd();
            safeStartRecognition();
            return;
        }

        const chunk = chunks[chunkIndex++];
        const encoded = encodeURIComponent(chunk);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=gu&q=${encoded}`;

        const audio = new Audio(url);
        currentAudioPlayer = audio;
        audio.playbackRate = (mood === 'angry') ? 1.08 : 1.0;

        audio.onended = () => {
            if (!isAudioCanceled) playNextChunk();
        };

        audio.onerror = () => {
            console.warn('Cloud audio stream fallback to Web Speech synthesis for chunk:', chunk);
            playWebSpeechSynthesis(chunk, () => {
                if (!isAudioCanceled) playNextChunk();
            }, mood);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Audio play restricted or network issue, using Web Speech synthesis:', err);
                playWebSpeechSynthesis(chunk, () => {
                    if (!isAudioCanceled) playNextChunk();
                }, mood);
            });
        }
    }

    playNextChunk();
}

// Web Speech synthesis with smart phonetics for clear speech
function playWebSpeechSynthesis(cleanText, onEnd = null, mood = 'neutral') {
    if (!window.speechSynthesis) {
        if (onEnd) onEnd();
        return;
    }

    try {
        window.speechSynthesis.resume();
    } catch (e) {}

    const voiceInfo = findBestSpeechVoice();
    let textToSpeak = cleanText;
    let lang = 'gu-IN';

    // If only English or default non-Indic voice is present, use Gujarati phonetics so words sound natural
    if (voiceInfo && voiceInfo.type !== 'gujarati' && voiceInfo.type !== 'hindi') {
        textToSpeak = GujaratiPhonetics.toPhonetic(cleanText);
        lang = 'en-IN';
    } else if (voiceInfo && voiceInfo.type === 'hindi') {
        lang = 'hi-IN';
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang;
    
    // Adjust pitch and rate for angry tone vs standard tone
    if (mood === 'angry') {
        utterance.pitch = 1.18;
        utterance.rate = 1.06;
    } else {
        utterance.pitch = 1.0;
        utterance.rate = 0.95;
    }
    utterance.volume = 1.0;

    if (voiceInfo && voiceInfo.voice) {
        utterance.voice = voiceInfo.voice;
    }

    window._activeUtterance = utterance;

    utterance.onstart = () => {
        botStatus.innerText = (mood === 'angry') ? "😡 Macaw Warning User..." : "🦜 Macaw Speaking...";
        console.log('🦜 Speaking: ' + cleanText.substring(0, 50) + '...');
    };

    utterance.onend = () => {
        window._activeUtterance = null;
        isBotSpeaking = false;
        botStatus.innerText = "Stable";
        if (onEnd) onEnd();
        safeStartRecognition();
    };

    utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event.error);
        window._activeUtterance = null;
        isBotSpeaking = false;
        botStatus.innerText = "Stable";
        if (onEnd) onEnd();
        safeStartRecognition();
    };

    try {
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.warn('Speech synthesis speak failed:', error);
        window._activeUtterance = null;
        isBotSpeaking = false;
        botStatus.innerText = "Stable";
        if (onEnd) onEnd();
    }
}

// Master speak function - plays pure Gujarati speech directly
function speak(text, onEnd = null, mood = 'neutral') {
    isBotSpeaking = true;
    if (recognition) { try { recognition.stop(); } catch (e) {} }

    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[*#_`~]/g, '').trim();
    if (!cleanText) {
        isBotSpeaking = false;
        if (onEnd) onEnd();
        return;
    }

    getAudioContext();
    stopCurrentAudio();

    if (speechVoices.length === 0 && window.speechSynthesis) {
        speechVoices = window.speechSynthesis.getVoices() || [];
    }

    // If native Gujarati voice is present in the browser, use native Web Speech
    if (hasNativeGujaratiVoice()) {
        console.log('🎤 Using native Gujarati voice');
        playWebSpeechSynthesis(cleanText, onEnd, mood);
    } else {
        // Otherwise stream pure Gujarati audio via cloud stream (with smart phonetic fallback)
        console.log('🌐 Streaming pure Gujarati voice audio');
        playGujaratiAudioStream(cleanText, onEnd, mood);
    }
}

// Utility: Speak custom text
window.testSpeak = (text = 'નમસ્તે! હું નખરા-લાલ છું. તમે કેમ છો?', mood = 'neutral') => {
    console.log(`🦜 Testing Gujarati speech with: "${text}"`);
    speak(text, null, mood);
};

// Utility: Test available voices & audio
window.testVoices = () => {
    const testText = 'નમસ્તે! હું નખરા-લાલ છું. આ એક પરીક્ષણ છે.';
    console.log('%c🦜 Testing Gujarati Speech...', 'color: #ff6600; font-weight: bold; font-size: 14px;');
    speak(testText);
};

// Status checker
window.macawStatus = () => {
    console.log('%c=== 🦜 MACAW GUJARATI SPEECH STATUS ===', 'color: #ff6600; font-weight: bold; font-size: 14px;');
    console.log('✅ Gujarati Speech Engine: ACTIVE');
    console.log(`🌐 Cloud Gujarati Audio Stream: READY (Authentic Gujarati)`);
    
    const bestVoice = findBestSpeechVoice();
    if (bestVoice && bestVoice.voice) {
        console.log(`🎤 Browser Voice: ${bestVoice.voice.name} (${bestVoice.type})`);
    }
    console.log('📝 Try: testSpeak("નમસ્તે"), testVoices(), macawStatus()');
};

window.stopSpeaking = stopCurrentAudio;

/* --- SPAM PROTECTION & ANGRY WARNING ENGINE --- */
let lastUserMessageTime = 0;
let spamCount = 0;
let spamResetTimer = null;
let isAngryWarningActive = false;

const spamAngryResponses = [
    "જરા ઊભા રહો! પહેલાં મારી વાત પૂરી થવા દો, સ્પેમ ન કરો! 😠",
    "શાંતિ રાખો! મને બોલી લેવા દો, આમ વારંવાર મેસેજ સ્પેમ ન કરો! 😤",
    "અરેરે! થોડી ધીરજ રાખો, મને પૂરું કરવા દો! સ્પેમ ન કરો! 😡"
];

function checkSpamDetected() {
    const now = Date.now();
    const timeDiff = now - lastUserMessageTime;
    lastUserMessageTime = now;

    if (isAngryWarningActive) return false;

    // Condition 1: User sends message while bot is actively speaking
    if (isBotSpeaking) {
        spamCount += 2;
    }
    // Condition 2: Rapid consecutive messages within 1.8 seconds
    else if (timeDiff < 1800) {
        spamCount += 1;
    } else {
        spamCount = 1;
    }

    if (spamResetTimer) clearTimeout(spamResetTimer);
    spamResetTimer = setTimeout(() => {
        spamCount = 0;
    }, 4500);

    return spamCount >= 2;
}

function safeStartRecognition() {
    if (recognition && !isListening && !isBotSpeaking && !isRecognitionStartingOrRunning) {
        try {
            isRecognitionStartingOrRunning = true;
            recognition.start();
        } catch (e) {
            isRecognitionStartingOrRunning = false;
        }
    }
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    appendMsg(text, 'user');

    // Check if user is spamming messages or interrupting speech
    if (checkSpamDetected()) {
        isAngryWarningActive = true;
        const angryMsg = spamAngryResponses[Math.floor(Math.random() * spamAngryResponses.length)];
        stopCurrentAudio(); // Interrupt to deliver angry warning
        botRespond(angryMsg, "angry", () => {
            isAngryWarningActive = false;
            // Return to calm neutral state after brief pause
            setTimeout(() => {
                if (!isBotSpeaking && birdSvg) {
                    birdSvg.className.baseVal = 'macaw-svg-custom w-full h-full react-neutral mood-neutral';
                }
            }, 1200);
        });
        return;
    }

    await processAI(text);
}

async function toggleMic() {
    if (!recognition) return alert("Speech recognition not supported");
    if (isListening) {
        autoRestartMic = false;
        recognition.stop();
    } else {
        autoRestartMic = true;
        isStandby = false;
        safeStartRecognition();
    }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'gu-IN';

    recognition.onstart = () => {
        isListening = true;
        isRecognitionStartingOrRunning = false;
        micBtn.classList.add('mic-active');
        botStatus.innerText = "Listening...";
    };

    recognition.onresult = async (event) => {
        const resultText = event.results[event.results.length - 1][0].transcript.trim();
        userInput.value = resultText;
        handleSend();
    };

    recognition.onend = () => {
        isListening = false;
        isRecognitionStartingOrRunning = false;
        micBtn.classList.remove('mic-active');
        if (autoRestartMic && !isBotSpeaking) {
            setTimeout(safeStartRecognition, 200);
        }
    };
}

function resetBoredomTimer() {
    if (typeof boredomTimer !== 'undefined' && boredomTimer !== null) {
        clearTimeout(boredomTimer);
    }
    boredomTimer = setTimeout(() => {
        if (!isBotSpeaking && !isListening) {
            botRespond("નખરા-લાલ હવે કંટાળાથી પાંખો ખંખેરી રહી છે. જલ્દી કંઈક બોલો!", "sad");
        }
    }, 45000);
}

if (fileInput) {
    fileInput.onchange = (e) => {
        Array.from(e.target.files).forEach(file => {
            const name = file.name;
            const lowerName = name.toLowerCase();
            const reader = new FileReader();

            if (lowerName.endsWith('.pdf')) {
                reader.onload = async (ev) => {
                    try {
                        const typedArray = new Uint8Array(ev.target.result);
                        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            fullText += content.items.map(item => item.str).join(' ') + '\n';
                        }
                        const newDoc = { name, text: fullText.trim() };
                        await saveDocToDB(newDoc);
                        documents.push(newDoc);
                        renderFileList();
                        botRespond(`${name} (${pdf.numPages} પાના) સાચવવામાં આવી છે!`, 'happy');
                    } catch (err) {
                        botRespond(`${name} વાંચવામાં ભૂલ આવી!`, 'sad');
                    }
                };
                reader.readAsArrayBuffer(file);

            } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
                reader.onload = async (ev) => {
                    try {
                        const res = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
                        const newDoc = { name, text: res.value.trim() };
                        await saveDocToDB(newDoc);
                        documents.push(newDoc);
                        renderFileList();
                        botRespond(`${name} સાચવવામાં આવી છે!`, 'happy');
                    } catch (err) {
                        botRespond(`${name} વાંચવામાં ભૂલ આવી!`, 'sad');
                    }
                };
                reader.readAsArrayBuffer(file);

            } else {
                reader.onload = async (ev) => {
                    const newDoc = { name, text: ev.target.result.trim() };
                    await saveDocToDB(newDoc);
                    documents.push(newDoc);
                    renderFileList();
                    botRespond(`${name} સાચવવામાં આવી છે!`, 'happy');
                };
                reader.readAsText(file);
            }
        });
    };
}

function renderFileList() {
    fileListDisplay.innerHTML = '';
    docCounter.textContent = `${documents.length} files`;
    if (documents.length === 0) {
        fileListDisplay.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No documents saved offline.</p>`;
        return;
    }
    documents.forEach((d, i) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = "flex justify-between items-center bg-gray-100 p-2 rounded-xl mb-1.5 text-xs border border-gray-200";
        itemDiv.innerHTML = `<span class="truncate pr-2 font-medium text-slate-700">📄 ${d.name}</span>`;
        const btn = document.createElement('button');
        btn.className = "text-red-500 font-bold bg-white w-5 h-5 rounded-full hover:bg-red-50";
        btn.textContent = "✕";
        btn.onclick = async () => {
            await deleteDocFromDB(d.name);
            documents.splice(i, 1);
            renderFileList();
            if (documents.length === 0) {
                botRespond("મેં આ ફાઈલ કાઢી નાખી છે. હવે તમારો ડેટા સંપૂર્ણ ખાલી થઈ ગયો છે!", "sad");
            } else {
                botRespond(`${d.name} ફાઈલ કાઢી નાખી છે.`, "neutral");
            }
        };
        itemDiv.appendChild(btn);
        fileListDisplay.appendChild(itemDiv);
    });
}

async function clearKnowledge() {
    await clearAllDocsFromDB();
    documents = [];
    renderFileList();
    botRespond("મેં આ ફાઈલ કાઢી નાખી છે. હવે તમારો ડેટા સંપૂર્ણ ખાલી થઈ ગયો છે!", "sad");
}

function appendMsg(text, sender) {
    const div = document.createElement('div');
    div.className = `msg-bubble ${sender === 'user' ? 'msg-user' : 'msg-bot'}`;
    div.innerHTML = `<strong>${sender === 'user' ? 'તમે' : 'નખરા-લાલ'}:</strong><br>${text}`;
    if (sender === 'bot') {
        div.title = "ક્લિક કરો ફરી સાંભળવા માટે (Click to replay audio)";
        div.addEventListener('click', () => {
            speak(text);
        });
    }
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });