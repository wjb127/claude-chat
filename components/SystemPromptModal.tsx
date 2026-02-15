"use client";

import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onSave: (prompt: string) => void;
}

export default function SystemPromptModal({
  isOpen,
  onClose,
  systemPrompt,
  onSave,
}: Props) {
  const [value, setValue] = useState(systemPrompt);

  useEffect(() => {
    setValue(systemPrompt);
  }, [systemPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-bold mb-4">시스템 프롬프트 설정</h2>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="시스템 프롬프트를 입력하세요... (예: 너는 Spring 전문가야)"
          className="w-full h-40 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
              onSave(value);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
