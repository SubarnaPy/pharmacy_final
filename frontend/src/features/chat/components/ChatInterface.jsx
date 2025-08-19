import React, { useState, useEffect, useRef } from 'react';
import socket from '../chatAPI';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to chat');
    });
    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => {
      socket.off('message');
      socket.off('connect');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      socket.emit('message', { text: input });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-2xl font-bold mb-4">Chat</h2>
      <div className="flex-1 overflow-auto mb-4 border p-2">
        {messages.map((m, i) => (
          <div key={i} className={`my-1 p-1 rounded ${m.sender === 'me' ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'}`}>
            <span className="text-sm text-gray-700">{m.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          className="flex-1 border p-2"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={handleSend} className="bg-blue-500 text-white px-4 ml-2">Send</button>
      </div>
    </div>
  );
}

export default ChatInterface;
