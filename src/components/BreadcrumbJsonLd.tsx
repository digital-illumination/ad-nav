import { BASE_URL } from "@/lib/constants";

/**
 * Minimal BreadcrumbList JSON-LD for top-level pages.
 *
 * For two-level breadcrumbs (Home → Current), pass the current page's display
 * name and path. The current page carries `item` too, which is permitted by
 * the spec and makes the markup more defensive in case Google changes how it
 * surfaces breadcrumbs.
 */
interface Props {
  name: string;
  path: string; // e.g. "/about"
}

export default function BreadcrumbJsonLd({ name, path }: Props) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: `${BASE_URL}${path}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
