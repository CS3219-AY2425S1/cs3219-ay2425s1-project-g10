import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:1234', {
  reconnectionAttempts: 3, // attempt reconnection 3 times
  timeout: 5000,            // connection timeout
});

interface ChatProps {
  sessionId: string;
}

const Chat: React.FC<ChatProps> = ({ sessionId }) => {
  const [room, setRoom] = useState<string>(sessionId);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; sender: boolean }[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const joinRoom = () => {
    if (room !== '') {
      socket.emit('join_room', room);
    }
  };

  const sendMessage = () => {
    if (!message) return; // Checking if there's a message to send

    const messageData = { message, room, senderId: socket.id };

    setMessages((prevMessages) => [...prevMessages, { text: message, sender: true }]);
    setMessage('');

    socket.emit('send_message', messageData, (ackError: string | null) => {
      if (ackError) {
        setConnectionError("Failed to send message. Please try again.");
        console.error("Message not sent:", ackError);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    joinRoom(); // Automatically join the room based on sessionId

    socket.on('connect_error', (err) => {
      setConnectionError('Connection error. Please try again.');
    });

    socket.on('connect_timeout', () => {
      setConnectionError('Connection timed out. Retrying...');
    });

    socket.on('reconnect_failed', () => {
      setConnectionError('Reconnection failed. Please check your network.');
    });

    socket.on('receive_message', (data) => {
      if (data.senderId !== socket.id) {
        setMessages((prevMessages) => [...prevMessages, { text: data.message, sender: false }]);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('connect_error');
      socket.off('connect_timeout');
      socket.off('reconnect_failed');
    };
  }, [room]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-box flex flex-col h-full min-h-[100px] p-4 rounded-lg bg-white text-black">
      <h4 className="chat-heading text-sm font-semibold border-b border-gray-200">Chat</h4>

      {connectionError && (
        <div className="error-message text-red-500 text-sm ">{connectionError}</div>
      )}

      <div className="messages flex-grow overflow-y-auto text-sm flex flex-col space-y-1 mt-1">
        {messages.map((msg, index) => (<>
          <div
            key={index}
            className={`message max-w-[60%] rounded-md h-fit px-2 py-px ${msg.sender ? 'bg-green-200 self-end text-right' : 'bg-gray-200 self-start text-left'
              }`}
          >
            {msg.text}
          </div>
          <div ref={messagesEndRef} />
        </>
        ))}
      </div>

      <div className="input-container flex space-x-1 mt-1">
        <input
          type="text"
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow border border-gray-300 text-sm rounded-md bg-white text-black focus:outline-none focus:border-green-500 min-w-0 px-1 py-px"
        />
        <button
          className="sendBtn bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none px-2 py-px"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>

  );
};

export default Chat;
