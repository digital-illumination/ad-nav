import { getBlogPosts } from "@/lib/content";
import { BASE_URL, SITE_DESCRIPTION } from "@/lib/constants";

export async function GET() {
  const posts = getBlogPosts();

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>${post.tags.map((tag) => `
      <category>${tag}</category>`).join("")}
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ad-Nav Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-gb</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
