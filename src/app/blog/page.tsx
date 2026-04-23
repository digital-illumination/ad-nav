import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getBlogPosts } from "@/lib/content";
import NeonCard from "@/components/NeonCard";
import GlitchText from "@/components/GlitchText";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Thoughts on AI agents, digital transformation, Salesforce, and the agent-first journey.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="page-transition py-16 px-4">
      <BreadcrumbJsonLd name="Blog" path="/blog" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // blog.md
          </p>
          <GlitchText
            text="Blog"
            as="h1"
            className="text-4xl sm:text-5xl font-mono font-bold neon-text-purple mb-4"
          />
          <p className="text-text-secondary font-mono">
            Dispatches from the frontier of AI, tech leadership, and digital
            transformation.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <NeonCard className="text-center">
            <p className="text-text-secondary font-mono">
              <span className="text-neon-cyan">&gt;</span> Blog posts are being
              loaded into the system...
              <br />
              <span className="text-text-dim text-sm">
                Check back soon for insights on the agent-first journey.
              </span>
            </p>
          </NeonCard>
        ) : (
          <div className="flex flex-col gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
                <NeonCard className="hover:border-neon-purple transition-all duration-300 cursor-pointer overflow-hidden !p-0">
                  {post.image && (
                    <div className="relative w-full h-48 sm:h-56">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover brightness-75"
                        sizes="(max-width: 768px) 100vw, 896px"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-neon-pink">
                        {post.date}
                      </span>
                      <span className="text-xs font-mono text-text-dim">
                        {post.readingTime}
                      </span>
                    </div>
                    <h2 className="text-lg font-mono font-bold text-foreground mb-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">
                      {post.excerpt}
                    </p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs font-mono border border-border-glow text-neon-cyan rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </NeonCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
