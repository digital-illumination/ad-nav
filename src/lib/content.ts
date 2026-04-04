import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  image?: string;
  content: string;
  readingTime: string;
}

export interface ContextFile {
  filename: string;
  title: string;
  description: string;
  content: string;
}

function estimateReadingTime(text: string): string {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export function getBlogPosts(): BlogPost[] {
  const blogDir = path.join(contentDir, "blog");
  if (!fs.existsSync(blogDir)) return [];

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.(mdx|md)$/, "");

      return {
        slug,
        title: data.title || slug,
        date: data.date || "",
        excerpt: data.excerpt || content.slice(0, 200) + "...",
        tags: data.tags || [],
        image: data.image || undefined,
        content,
        readingTime: estimateReadingTime(content),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPost(slug: string): BlogPost | null {
  const posts = getBlogPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export function getContextFiles(): ContextFile[] {
  const contextDir = path.join(contentDir, "context");
  if (!fs.existsSync(contextDir)) return [];

  const files = fs.readdirSync(contextDir).filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(contextDir, file), "utf-8");
    const { data, content } = matter(raw);
    const filename = file.replace(/\.md$/, "");

    return {
      filename,
      title: data.title || filename.replace(/-/g, " "),
      description: data.description || "",
      content,
    };
  });
}

export function getContextFile(filename: string): ContextFile | null {
  const files = getContextFiles();
  return files.find((f) => f.filename === filename) || null;
}
