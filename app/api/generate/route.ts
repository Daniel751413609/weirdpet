import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 把照片裡的東西直接「活化」成怪獸：石頭→石頭怪，芒果核→芒果核怪
const PET_PROMPT =
  "transform the main subject of this photo into a living cute cartoon monster, " +
  "the monster's body IS the original object given life, " +
  "keep the original object's shape silhouette and texture as the monster body, " +
  "add big round glossy cartoon eyes, tiny cute limbs, a funny expression, " +
  "small details like tiny horns or a stubby tail, " +
  "Pixar cartoon style, bright saturated colors, clean bold outlines, " +
  "friendly and funny, NOT realistic, full body visible, centered, " +
  "plain solid black background, soft studio rim light on character, " +
  "no background elements, no scenery, no other characters, " +
  "no text, no watermark, no humans";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "沒有收到圖片" }, { status: 400 });
    }

    // 把照片轉成 base64 給 Replicate
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // FLUX img2img：照片的顏色/氛圍 → 召喚出對應的生物
    const output = await replicate.run("black-forest-labs/flux-dev", {
      input: {
        prompt: PET_PROMPT,
        image: dataUrl,
        prompt_strength: 0.62,
        num_inference_steps: 28,
        guidance: 3.5,
        output_format: "webp",
        output_quality: 90,
      },
    });

    // 取得生成圖片 URL
    const outputArr = output as { url: () => Promise<string> }[] | string[];
    let generatedUrl: string;

    if (Array.isArray(outputArr) && outputArr.length > 0) {
      const first = outputArr[0];
      generatedUrl = typeof first === "string" ? first : await first.url();
    } else {
      throw new Error("Replicate 沒有回傳圖片");
    }

    // 把圖片抓回來轉 base64（避免前端跨域問題）
    const imgRes = await fetch(generatedUrl);
    if (!imgRes.ok) throw new Error("無法取得生成圖片");

    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = Buffer.from(imgBuffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/webp";

    return NextResponse.json({
      imageUrl: `data:${contentType};base64,${imgBase64}`,
    });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json(
      { error: "AI 召喚失敗，請再試一次" },
      { status: 500 }
    );
  }
}
