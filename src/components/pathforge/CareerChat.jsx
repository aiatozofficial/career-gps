import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../../services/resumeService";
import {
  saveChatHistory,
  loadChatHistory,
  loadResumeAnalysis,
  loadRoadmap
} from "../../services/localStorageService";

export default function CareerChat({ profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "What specific skills should I learn first?",
    "Review my target career roadmap and give me tips",
    "How's the job market for my selected goal?",
    "What certifications are best for my budget tier?",
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const cached = loadChatHistory();
    if (cached && cached.length > 0) {
      setMessages(cached);
      // Generate standard context-aware suggestions if we have chat history
      setSuggestions([
        "How can I improve my match score?",
        "What intermediate projects should I build?",
        "Give me networking strategies on LinkedIn",
      ]);
    } else {
      // Setup initial welcome message
      const welcome = {
        id: "welcome",
        role: "advisor",
        content: `Hi **${profile.name || "there"}**! I'm your AI Career Advisor. 
I have loaded your profile details, including your target career goal: **${profile.goal?.description || "Not specified"}**.

How can I help guide your professional growth today? Ask me about skill building, certifications, internships, or resume improvements!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
    }
  // Bug #19 fix: depend on full profile — profile.goal?.description is used in the
  // welcome message body so a goal-only change must also update the welcome text.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.goal?.description]);


  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text || !text.trim()) return;

    if (!textToSend) setInput("");

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setLoading(true);

    try {
      // Gather context
      const roadmap = loadRoadmap();
      const resumeAnalysis = loadResumeAnalysis();

      // Format history for backend (limit to last 15 messages for token control)
      const apiHistory = updatedMessages.slice(-15).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const reply = await sendChatMessage(apiHistory, profile, roadmap, resumeAnalysis);

      const botMsg = {
        id: `bot-${Date.now()}`,
        role: "advisor",
        content: reply.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);

      if (reply.suggestedActions && reply.suggestedActions.length > 0) {
        setSuggestions(reply.suggestedActions);
      } else {
        setSuggestions([
          "What certifications should I prioritize?",
          "How can I gain local experience?",
          "Recommend free learning platforms",
        ]);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: "advisor",
        content: "Error: I encountered an error communicating with the advisor engine. Please verify the API server is active and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      const welcome = {
        id: "welcome",
        role: "advisor",
        content: `History cleared. I'm ready to advise you! Ask me any career Q&A.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
      saveChatHistory([welcome]);
      setSuggestions([
        "What specific skills should I learn first?",
        "Review my target career roadmap and give me tips",
        "How's the job market for my selected goal?",
      ]);
    }
  };

  // Safe markdown renderer helper that converts bold, lists, and linebreaks
  const renderMarkdown = (text) => {
    if (!text) return "";
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Process bold formatting (**text**)
      let content = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const renderedLine = parts.length > 0 ? parts : content;

      // Handle Bullet points starting with "-" or "*"
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        // Process bold in bullet
        let bContent = bulletText;
        const bParts = [];
        let bLastIdx = 0;
        let bMatch;
        while ((bMatch = boldRegex.exec(bContent)) !== null) {
          if (bMatch.index > bLastIdx) {
            bParts.push(bContent.substring(bLastIdx, bMatch.index));
          }
          bParts.push(<strong key={bMatch.index} className="font-extrabold text-slate-900">{bMatch[1]}</strong>);
          bLastIdx = boldRegex.lastIndex;
        }
        if (bLastIdx < bContent.length) {
          bParts.push(bContent.substring(bLastIdx));
        }
        return (
          <li key={idx} className="ml-5 list-disc text-sm leading-relaxed mb-1.5 text-slate-700">
            {bParts.length > 0 ? bParts : bulletText}
          </li>
        );
      }

      // Handle standard linebreaks
      return (
        <p key={idx} className="text-sm leading-relaxed mb-2 text-slate-700 min-h-[1rem]">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      {/* Sidebar / Header */}
      <div className="flex flex-row justify-between items-center border-b border-slate-200 pb-4 mb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">AI Career Advisor Chat</h2>
          <p className="text-slate-600 text-sm mt-1">
            Get instant contextual advice, resume enhancements, and roadmap mentoring powered by Gemini.
          </p>
        </div>
        <button
          onClick={clearHistory}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition shadow-sm"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 space-y-4 max-h-[500px] shadow-inner chat-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <div
              className={`rounded-xl p-4 shadow-sm ${
                msg.role === "user"
                  ? "bg-[#28b7a5] text-[#0b463b] font-semibold"
                  : "bg-slate-50 border border-slate-200 text-slate-800"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="space-y-1">{renderMarkdown(msg.content)}</div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col max-w-[80%] mr-auto items-start">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Advisor is compiling insights</span>
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#28b7a5] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#28b7a5] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#28b7a5] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions and Quick Actions */}
      <div className="mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Suggested Actions</span>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(sug)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 font-semibold hover:border-[#28b7a5] hover:bg-[#28b7a5]/5 hover:text-slate-800 transition text-left shadow-sm"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Input container */}
      <div className="mt-4 flex gap-2 relative rounded-lg border border-slate-200 bg-white p-1.5 focus-within:border-[#28b7a5] transition shadow-sm">
        <input
          type="text"
          placeholder="Ask me anything, e.g. 'How do I bridge my experience gaps?'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="rounded-md bg-[#28b7a5] px-5 py-2 text-sm font-bold text-[#0b463b] hover:bg-[#39cbba] disabled:opacity-50 transition shadow"
        >
          Send
        </button>
      </div>
    </div>
  );
}
