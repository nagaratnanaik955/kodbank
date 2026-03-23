import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minus, MessageSquare, Bot, User, Loader2 } from 'lucide-react';

const GRADIO_URL = 'https://nagaratna11-agent.hf.space';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your KodBank assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatState, setChatState] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getLocalResponse = (query) => {
        const q = query.toLowerCase();
        if (q.includes('balance')) return 'To check your balance, click the "Check Balance" button on your main dashboard. Your minimum required balance is ₹2,000.';
        if (q.includes('transfer') || q.includes('send money')) return 'You can send money using the "Money Transfer" form. Just enter the receiver’s email and the amount, then click "Transfer Now".';
        if (q.includes('hello') || q.includes('hi')) return 'Hello! I am your KodBank automated assistant. I can help you with balance checks, money transfers, and account settings while the AI service is offline.';
        if (q.includes('help')) return 'I can help you navigate the app! Try asking about "balance" or "how to transfer money".';
        if (q.includes('login') || q.includes('credentials')) return 'If you are having trouble logging in, please ensure your email and password are correct. Contact support if the issue persists.';
        return "I'm currently in Automated Mode while the AI service is being updated. I can help with basic questions about KodBank functions like balance and transfers!";
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // If we are already in offline mode, skip the API
        if (isOffline) {
            setTimeout(() => {
                const response = getLocalResponse(userMessage);
                setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                setIsLoading(false);
            }, 600);
            return;
        }

        let botResponse = '';
        try {
            console.log('Initiating chat with message:', userMessage);

            // Step 1: POST to initiate
            const response = await fetch(`${GRADIO_URL}/gradio_api/call/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: [
                        userMessage,
                        chatState,
                        'You are a KodBank assistant.',
                        512,
                        0.7,
                        0.95
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API Offline (${response.status})`);
            }

            const body = await response.json();
            const event_id = body.event_id;

            if (!event_id) {
                throw new Error('Session creation failed');
            }

            // Step 2: Stream using fetch and manual buffering
            const streamResponse = await fetch(`${GRADIO_URL}/gradio_api/call/respond/${event_id}`);

            if (!streamResponse.ok) {
                throw new Error(`Stream failed`);
            }

            const reader = streamResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process lines in buffer
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep partial line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            if (Array.isArray(data)) {
                                const [output, newState] = data;

                                let text = '';
                                if (typeof output === 'string') text = output;
                                else if (output && output.text) text = output.text;
                                else if (output) text = JSON.stringify(output);

                                if (text) {
                                    botResponse = text;
                                    if (newState) setChatState(newState);

                                    setMessages(prev => {
                                        const lastMsg = prev[prev.length - 1];
                                        if (lastMsg && lastMsg.role === 'assistant') {
                                            return [...prev.slice(0, -1), { role: 'assistant', content: botResponse }];
                                        } else {
                                            return [...prev, { role: 'assistant', content: botResponse }];
                                        }
                                    });
                                }
                            }
                        } catch (err) {
                            console.debug('SSE parse skip:', trimmedLine);
                        }
                    } else if (trimmedLine.includes('event: complete')) {
                        setIsLoading(false);
                    } else if (trimmedLine.includes('event: error')) {
                        throw new Error('AI service reported an internal error during streaming');
                    }
                }
            }

        } catch (error) {
            console.error('Switching to offline mode:', error);
            setIsOffline(true);
            const fallback = getLocalResponse(userMessage);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ AI Service is currently unavailable. Switching to KodBank Automated Assistant...\n\n${fallback}`
            }]);
        }
        setIsLoading(true); // Keep spinner for a tiny bit longer for transition feel
        setTimeout(() => setIsLoading(false), 300);
    };


    return (
        <div className="chatbot-container">
            {!isOpen ? (
                <button className="chatbot-toggle" onClick={() => setIsOpen(true)}>
                    <MessageCircle size={24} />
                    <span className="chatbot-badge">AI</span>
                </button>
            ) : (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <Bot size={20} />
                            <span>KodBank Assistant</span>
                        </div>
                        <div className="chatbot-header-actions">
                            <button onClick={() => setIsOpen(false)} title="Minimize">
                                <Minus size={18} />
                            </button>
                            <button onClick={() => setIsOpen(false)} title="Close">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message-bubble ${msg.role}`}>
                                <div className="message-icon">
                                    {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                                </div>
                                <div className="message-content">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-bubble assistant loading">
                                <div className="message-icon">
                                    <Bot size={14} />
                                </div>
                                <div className="message-content">
                                    <Loader2 className="animate-spin" size={16} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input" onSubmit={handleSend}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
