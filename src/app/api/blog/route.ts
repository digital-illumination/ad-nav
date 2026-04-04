import { NextResponse } from "next/server";
import { getBlogPosts } from "@/lib/content";

export async function GET() {
  const posts = getBlogPosts();

  return NextResponse.json({
    total: posts.length,
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      excerpt: p.excerpt,
      tags: p.tags,
      readingTime: p.readingTime,
      url: `/api/blog/${p.slug}`,
    })),
  });
}
