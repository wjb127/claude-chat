"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Conversation, Message, DEFAULT_MODEL } from "@/lib/types";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import ChatInput from "@/components/ChatInput";
import ModelSelector from "@/components/ModelSelector";
import SystemPromptModal from "@/components/SystemPromptModal";

export default function Home() {
  // 대화 상태
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // UI 상태
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  // Supabase 미설정 시 로컬스토리지 사용
  const useLocal = !isSupabaseConfigured;

  // ── 대화 목록 로드 ──
  const loadConversations = useCallback(async () => {
    if (useLocal) {
      const stored = localStorage.getItem("conversations");
      if (stored) setConversations(JSON.parse(stored));
      return;
    }
    const { data } = await supabase!
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [useLocal]);

  // ── 메시지 로드 ──
  const loadMessages = useCallback(
    async (convId: string) => {
      if (useLocal) {
        const stored = localStorage.getItem(`messages_${convId}`);
        if (stored) setMessages(JSON.parse(stored));
        else setMessages([]);
        return;
      }
      const { data } = await supabase!
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    },
    [useLocal]
  );

  // ── 초기 로드 ──
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── 대화 선택 시 메시지 로드 ──
  useEffect(() => {
    if (currentConvId) {
      loadMessages(currentConvId);
      // 현재 대화의 모델/시스템 프롬프트 적용
      const conv = conversations.find((c) => c.id === currentConvId);
      if (conv) {
        setModel(conv.model);
        setSystemPrompt(conv.system_prompt || "");
      }
    }
  }, [currentConvId, conversations, loadMessages]);

  // ── 로컬 저장 헬퍼 ──
  const saveLocalConversations = (convs: Conversation[]) => {
    localStorage.setItem("conversations", JSON.stringify(convs));
    setConversations(convs);
  };

  const saveLocalMessages = (convId: string, msgs: Message[]) => {
    localStorage.setItem(`messages_${convId}`, JSON.stringify(msgs));
    setMessages(msgs);
  };

  // ── 새 대화 생성 ──
  const createConversation = async (): Promise<string> => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: "새 대화",
      system_prompt: systemPrompt || null,
      model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (useLocal) {
      saveLocalConversations([newConv, ...conversations]);
    } else {
      await supabase!.from("conversations").insert(newConv);
      await loadConversations();
    }

    setCurrentConvId(newConv.id);
    setMessages([]);
    return newConv.id;
  };

  // ── 대화 삭제 ──
  const deleteConversation = async (id: string) => {
    if (useLocal) {
      saveLocalConversations(conversations.filter((c) => c.id !== id));
      localStorage.removeItem(`messages_${id}`);
    } else {
      await supabase!.from("conversations").delete().eq("id", id);
      await loadConversations();
    }

    if (currentConvId === id) {
      setCurrentConvId(null);
      setMessages([]);
    }
  };

  // ── 대화 제목 업데이트 ──
  const updateConversationTitle = async (id: string, title: string) => {
    if (useLocal) {
      saveLocalConversations(
        conversations.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } else {
      await supabase!
        .from("conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id);
      await loadConversations();
    }
  };

  // ── 시스템 프롬프트 저장 ──
  const saveSystemPrompt = async (prompt: string) => {
    setSystemPrompt(prompt);
    if (currentConvId) {
      if (useLocal) {
        saveLocalConversations(
          conversations.map((c) =>
            c.id === currentConvId ? { ...c, system_prompt: prompt } : c
          )
        );
      } else {
        await supabase!
          .from("conversations")
          .update({ system_prompt: prompt })
          .eq("id", currentConvId);
      }
    }
  };

  // ── 메시지 전송 ──
  const handleSend = async (content: string, images: string[]) => {
    let convId = currentConvId;

    // 대화가 없으면 새로 생성
    if (!convId) {
      convId = await createConversation();
    }

    // 유저 메시지 추가
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: "user",
      content,
      image_urls: images.length > 0 ? images : null,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // 저장
    if (useLocal) {
      saveLocalMessages(convId, updatedMessages);
    } else {
      await supabase!.from("messages").insert(userMsg);
    }

    // 첫 메시지면 제목 자동 설정
    if (updatedMessages.length === 1) {
      const title =
        content.length > 30 ? content.slice(0, 30) + "..." : content || "이미지 대화";
      await updateConversationTitle(convId, title);
    }

    // Claude API 호출
    setIsLoading(true);
    setStreamingContent("");

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        images: m.image_urls || undefined,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          system: systemPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "API 요청 실패");
      }

      // SSE 스트리밍 파싱
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.text) {
                  fullContent += parsed.text;
                  setStreamingContent(fullContent);
                }
              } catch {
                // JSON 파싱 실패 무시
              }
            }
          }
        }
      }

      // 어시스턴트 메시지 저장
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: convId,
        role: "assistant",
        content: fullContent,
        image_urls: null,
        created_at: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      if (useLocal) {
        saveLocalMessages(convId, finalMessages);
      } else {
        await supabase!.from("messages").insert(assistantMsg);
        await supabase!
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "알 수 없는 에러";

      // 에러 메시지를 어시스턴트 메시지로 표시
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: convId,
        role: "assistant",
        content: `⚠️ 에러: ${errMsg}`,
        image_urls: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  return (
    <div className="flex h-dvh">
      {/* 사이드바 */}
      <ChatSidebar
        conversations={conversations}
        currentId={currentConvId}
        onSelect={setCurrentConvId}
        onNew={() => {
          setCurrentConvId(null);
          setMessages([]);
          setSystemPrompt("");
        }}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 툴바 */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          {/* 사이드바 토글 (모바일) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <ModelSelector model={model} onChange={setModel} />

          <button
            onClick={() => setPromptModalOpen(true)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              systemPrompt
                ? "border-blue-500 text-blue-400 hover:bg-blue-500/10"
                : "border-gray-600 text-gray-400 hover:bg-gray-800"
            }`}
          >
            시스템 프롬프트
          </button>

          {useLocal && (
            <span className="text-xs text-yellow-500 ml-auto">
              로컬 저장 모드
            </span>
          )}
        </header>

        {/* 채팅 영역 */}
        <ChatArea
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />

        {/* 입력 영역 */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* 시스템 프롬프트 모달 */}
      <SystemPromptModal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        systemPrompt={systemPrompt}
        onSave={saveSystemPrompt}
      />
    </div>
  );
}
