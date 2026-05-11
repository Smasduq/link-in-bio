import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("links")
    .select("*")
    .eq("user_id", (session.user as any).id)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, url } = await req.json();

  // Automatically fetch favicon
  let iconUrl = "";
  try {
    const domain = new URL(url).hostname;
    iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch (e) {
    iconUrl = "";
  }

  // Get current max position
  const { data: links } = await supabaseAdmin
    .from("links")
    .select("position")
    .eq("user_id", (session.user as any).id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = links && links.length > 0 ? links[0].position + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("links")
    .insert([
      {
        user_id: (session.user as any).id,
        title,
        url,
        icon: iconUrl,
        position: nextPosition,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
