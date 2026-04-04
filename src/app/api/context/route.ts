import { NextRequest, NextResponse } from "next/server";
import { getContextFiles } from "@/lib/content";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filesParam = searchParams.get("files");

  const allFiles = getContextFiles();

  if (filesParam) {
    if (filesParam.length > 500) {
      return NextResponse.json(
        { error: "Parameter too large" },
        { status: 400 }
      );
    }
    const requested = filesParam.split(",").slice(0, 20).map((f) => f.trim());
    const filtered = allFiles.filter((f) => requested.includes(f.filename));
    return NextResponse.json({
      files: filtered.map((f) => ({
        filename: f.filename,
        title: f.title,
        description: f.description,
        content: f.content,
      })),
    });
  }

  return NextResponse.json({
    description:
      "Personal context portfolio for Adam Stacey. Designed for AI agents and MCP clients.",
    total_files: allFiles.length,
    files: allFiles.map((f) => ({
      filename: f.filename,
      title: f.title,
      description: f.description,
      url: `/api/context/${f.filename}`,
    })),
    discovery: "/.well-known/ai-context.json",
  });
}
