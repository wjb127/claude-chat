"use client";

import { AVAILABLE_MODELS } from "@/lib/types";

interface Props {
  model: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ model, onChange }: Props) {
  return (
    <select
      value={model}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
    >
      {AVAILABLE_MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
