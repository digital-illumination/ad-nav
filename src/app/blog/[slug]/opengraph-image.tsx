import { ImageResponse } from "next/og";
import { getBlogPost, getBlogPosts } from "@/lib/content";

export const alt = "Ad-Nav Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  const title = post?.title ?? "Blog Post";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px",
          background: "#0a0a0f",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #b829e3, #ff2d95, #00f0ff)",
          }}
        />
        <div
          style={{
            fontSize: 20,
            color: "#00f0ff",
            marginBottom: 16,
            letterSpacing: "0.1em",
          }}
        >
          AD-NAV // BLOG
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#e0e0e0",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#8a8a9a",
            marginTop: 16,
          }}
        >
          Adam Stacey
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #00f0ff, #ff2d95, #b829e3)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
