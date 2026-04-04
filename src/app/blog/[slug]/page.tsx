import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/content";
import NeonCard from "@/components/NeonCard";
import Link from "next/link";
import Image from "next/image";
import { remark } from "remark";
import remarkHtml from "remark-html";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: new Date(post.date).toISOString(),
      tags: post.tags,
      images: post.image ? [post.image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const result = await remark().use(remarkHtml).process(post.content);
  const htmlContent = result.toString();

  return (
    <div className="page-transition">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            datePublished: new Date(post.date).toISOString(),
            author: { "@type": "Person", name: "Adam Stacey" },
            description: post.excerpt,
            ...(post.image && { image: post.image }),
          }),
        }}
      />
      {/* Hero image — full width */}
      {post.image && (
        <div className="relative w-full h-56 sm:h-72 md:h-80">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover brightness-[0.6]"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-mono text-text-secondary hover:text-neon-purple transition-colors mb-8"
        >
          <span>&larr;</span> Back to Blog
        </Link>

        {/* Post header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm font-mono text-neon-pink">{post.date}</span>
            <span className="text-sm font-mono text-text-dim">
              {post.readingTime}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-mono font-bold neon-text-purple mb-4">
            {post.title}
          </h1>
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

        {/* Post content */}
        <NeonCard>
          <div
            className="prose-cyberpunk"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </NeonCard>
      </div>
    </div>
  );
}
