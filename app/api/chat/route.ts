import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { ChatRequest } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, model, system } = (await req.json()) as ChatRequest;

    // Claude API용 메시지 변환
    const formattedMessages = messages.map((msg) => {
      if (msg.images && msg.images.length > 0) {
        // 이미지 포함 멀티모달 메시지
        const content: Anthropic.MessageCreateParams["messages"][0]["content"] =
          [];

        for (const img of msg.images) {
          // base64 데이터에서 media_type 추출
          const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1] as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: match[2],
              },
            });
          }
        }

        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }

        return { role: msg.role as "user" | "assistant", content };
      }

      return { role: msg.role as "user" | "assistant", content: msg.content };
    });

    // 스트리밍 응답
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 8192,
      system: system || undefined,
      messages: formattedMessages,
    });

    // ReadableStream으로 SSE 변환
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : "스트리밍 에러";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errMsg })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 에러";
    return Response.json({ error: message }, { status: 500 });
  }
}
