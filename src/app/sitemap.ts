import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/content";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/projects`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/cv`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/context`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];

  const blogPosts: MetadataRoute.Sitemap = getBlogPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPosts];
}
