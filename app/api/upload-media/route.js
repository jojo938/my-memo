import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

export async function POST(req) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 클라이언트가 설정되지 않았어요." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");
    const originalName = formData.get("filename") || (file && file.name) || `media-${Date.now()}`;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 필요해요." }, { status: 400 });
    }
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId가 필요해요." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    const mime = file.type || "application/octet-stream";
    const lowerName = originalName.toLowerCase();
    const ext = lowerName.split(".").pop() || "";

    let contentType = mime;
    let uploadExt = ext;
    let processed = false;

    const isImage = mime.startsWith("image/");
    const isGif = isImage && (mime === "image/gif" || uploadExt === "gif");
    const isMp4 = mime === "video/mp4" || uploadExt === "mp4";

    if (isImage && !isGif) {
      buffer = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      contentType = "image/jpeg";
      uploadExt = "jpg";
      processed = true;
    }

    if (!isImage && !isMp4) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식이에요. 이미지, GIF, MP4만 가능합니다." }, { status: 400 });
    }

    const safeBaseName = lowerName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]/g, "_");
    const fileName = `${safeBaseName || "media"}-${Date.now()}.${uploadExt}`;
    const path = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("memo-media").upload(path, buffer, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message || "업로드에 실패했어요." }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from("memo-media").getPublicUrl(path);
    const url = publicData?.publicUrl;

    return NextResponse.json(
      {
        url,
        processed,
        contentType,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "업로드 중 오류가 발생했어요." }, { status: 500 });
  }
}

