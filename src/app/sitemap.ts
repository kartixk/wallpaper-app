import type { MetadataRoute } from "next";

const SITE_URL = "https://abishek-pencil.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/gallery", "/explore", "/pencil"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
