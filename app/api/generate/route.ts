import { NextRequest, NextResponse } from "next/server";

const PET_PROMPT =
  "A bizarre adorable fantasy creature pet, cute but slightly unsettling, " +
  "like a Tamagotchi crossed with a weird alien lifeform, " +
  "glowing eyes, impossible neon colors, unusual textures fluffy crystalline slimy bioluminescent, " +
  "vibrant kawaii digital illustration, simple dark void background, no text no watermarks";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "沒有收到圖片" }, { status: 400 });

    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(PET_PROMPT)}?width=512&height=512&nologo=true&model=flux&seed=${seed}`;

    const res = await fetch(url, { method: "GET", headers: { "User-Agent": "WeirdPet/1.0" } });
    if (!res.ok) throw new Error(`Pollinations 回應 ${res.status}`);

    const imageBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return NextResponse.json({ imageUrl: `data:${contentType};base64,${base64}` });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json({ error: "AI 召喚失敗，請再試一次" }, { status: 500 });
  }
}
