import { NextResponse } from "next/server";
import { getBlogPost } from "@/lib/content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    tags: post.tags,
    readingTime: post.readingTime,
    content: post.content,
  });
}
