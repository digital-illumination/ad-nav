import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/content";
import { BASE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogPosts();

  // Use the most recent blog post date as the "site last updated" hint for
  // static pages. Falls back to the build date if there are no posts.
  const mostRecentPostDate = posts.length > 0 ? new Date(posts[0].date) : new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: mostRecentPostDate, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: mostRecentPostDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: mostRecentPostDate, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/projects`, lastModified: mostRecentPostDate, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/cv`, lastModified: mostRecentPostDate, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/context`, lastModified: mostRecentPostDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: mostRecentPostDate, changeFrequency: "yearly", priority: 0.5 },
  ];

  const blogPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...blogPosts];
}
