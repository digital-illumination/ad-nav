import { NextResponse } from "next/server";
import { getContextFile } from "@/lib/content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const contextFile = getContextFile(file);

  if (!contextFile) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  return new NextResponse(contextFile.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
