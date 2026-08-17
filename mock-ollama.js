/**
 * Mock Ollama API - Intercepts fetch calls to localhost:11434
 * Provides demo responses when Ollama is not available
 */

(function() {
    'use strict';
    
    // Mock responses dictionary
    const MOCK_RESPONSES = {
        'hello': 'નમસ્તે! હું નખરા-લાલ છું, તમારો ડોક્યુમેન્ટ એનાલાઇઝર। આજે મને કેવી રીતે મદદ કરી શકો?',
        'hi': 'Hello! I\'m Nakhralal, your smart document analyzer. 🦜 How can I help you today?',
        'macaw': 'Hey! I\'m listening now. 🎤 Tell me about your documents and I\'ll help extract information!',
        'help': 'I can help you analyze PDF, DOCX, and TXT files to extract facts and answer questions. Upload your documents!',
        'test': 'This is a test response from the mock LLM! Upload real documents for accurate analysis.',
        'namaste': 'નમસ્તે અને આપણાને શુ કહેવું છે?',
        'gujarati': 'ગુજરાતી ભાષા આપણાનો ગર્વ છે! 🇮🇳',
        'default': 'That\'s an interesting question! Please upload relevant documents for accurate analysis. (તમારા ડોક્યુમેન્ટ્સ અપલોડ કરો)'
    };
    
    // Original fetch function
    const originalFetch = window.fetch;
    
    // Intercept fetch calls
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        // Check if this is an Ollama API call
        if (typeof url === 'string' && url.includes('localhost:11434')) {
            return handleOllamaAPICall(url, options, args);
        }
        
        // For non-Ollama URLs, use original fetch
        return originalFetch.apply(this, args);
    };
    
    /**
     * Handle Ollama API calls locally
     */
    function handleOllamaAPICall(url, options, originalArgs) {
        return new Promise((resolve, reject) => {
            try {
                if (url.includes('/api/tags')) {
                    resolve(new Response(JSON.stringify({
                        models: [
                            { name: 'gemma', size: 2000000000, modified_at: '2025-01-15T10:00:00Z' },
                            { name: 'gemma:2b', size: 1500000000, modified_at: '2025-01-15T10:00:00Z' }
                        ]
                    }), {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'Content-Type': 'application/json' }
                    }));
                } 
                else if (url.includes('/api/generate')) {
                    // Parse the request body to get the prompt
                    if (options.body) {
                        try {
                            const data = JSON.parse(options.body);
                            const response = generateMockResponse(data.prompt || '');
                            
                            resolve(new Response(JSON.stringify({
                                model: data.model || 'gemma:2b',
                                response: response,
                                done: true,
                                created_at: new Date().toISOString(),
                                context: [],
                                total_duration: 1000000000,
                                load_duration: 500000000,
                                prompt_eval_count: (data.prompt || '').split(' ').length,
                                prompt_eval_duration: 300000000,
                                eval_count: response.split(' ').length,
                                eval_duration: 200000000
                            }), {
                                status: 200,
                                statusText: 'OK',
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        } catch (e) {
                            resolve(new Response(JSON.stringify({ error: 'Invalid request' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        }
                    }
                }
                else if (url.includes('/api/chat')) {
                    // Parse chat messages
                    if (options.body) {
                        try {
                            const data = JSON.parse(options.body);
                            let userMessage = '';
                            
                            if (data.messages && Array.isArray(data.messages)) {
                                // Get last user message
                                for (let i = data.messages.length - 1; i >= 0; i--) {
                                    if (data.messages[i].role === 'user') {
                                        userMessage = data.messages[i].content || '';
                                        break;
                                    }
                                }
                            }
                            
                            const response = generateMockResponse(userMessage);
                            
                            resolve(new Response(JSON.stringify({
                                model: data.model || 'gemma:2b',
                                created_at: new Date().toISOString(),
                                message: {
                                    role: 'assistant',
                                    content: response
                                },
                                done: true,
                                total_duration: 1000000000,
                                load_duration: 500000000,
                                prompt_eval_count: userMessage.split(' ').length,
                                prompt_eval_duration: 300000000,
                                eval_count: response.split(' ').length,
                                eval_duration: 200000000
                            }), {
                                status: 200,
                                statusText: 'OK',
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        } catch (e) {
                            resolve(new Response(JSON.stringify({ error: 'Invalid request' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        }
                    }
                }
                else {
                    // Default response
                    resolve(new Response(JSON.stringify({ status: 'ok' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Generate a mock response based on the user's prompt
     */
    function generateMockResponse(prompt) {
        const lowerPrompt = (prompt || '').toLowerCase().trim();
        
        // Check for keyword matches
        for (const [keyword, response] of Object.entries(MOCK_RESPONSES)) {
            if (lowerPrompt.includes(keyword)) {
                return response;
            }
        }
        
        // Default response
        return MOCK_RESPONSES.default;
    }
    
    // Log to console
    console.log('%c🦜 Mock Ollama API Active (Demo Mode)', 'color: #ef4444; font-weight: bold; font-size: 14px;');
    console.log('%cFor full functionality, install Ollama from https://ollama.ai', 'color: #666; font-size: 12px;');
})();
