"use client";

interface Props {
  images: string[];
  onRemove: (index: number) => void;
}

export default function ImagePreview({ images, onRemove }: Props) {
  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-700">
      {images.map((img, i) => (
        <div key={i} className="relative group">
          <img
            src={img}
            alt={`미리보기 ${i + 1}`}
            className="w-16 h-16 object-cover rounded-lg border border-gray-600"
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
