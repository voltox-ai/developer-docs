// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const site = process.env.SITE_URL ?? "https://developers.voltox.ai";
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Voltox Developers",
      description: "Integrate Voltox Age Verification, Smile & Pay, Face Recognition and KYC with wallee terminals, SoftPOS and e-commerce — built along ep2.",
      logo: { src: "./src/assets/voltox-logo.svg", replacesTitle: true },
      favicon: "/favicon.svg",
      customCss: ["./src/styles/voltox.css"],
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/voltox-ai/developer-docs" }],
      lastUpdated: false,
      pagination: true,
      head: [
        { tag: "meta", attrs: { name: "referrer", content: "no-referrer" } },
        { tag: "link", attrs: { rel: "alternate", type: "text/plain", href: `${base}llms.txt`, title: "llms.txt" } },
      ],
      sidebar: [
        { label: "Start", items: [
          { label: "Introduction", slug: "introduction" },
          { label: "Getting started", slug: "getting-started" },
          { label: "Integration options", slug: "integration-options" },
          { label: "Voltox AI Dev MCP", slug: "mcp-in-claude" },
          { label: "Security, privacy & compliance", slug: "security-privacy-compliance" },
        ] },
        { label: "Products", autogenerate: { directory: "products" } },
        { label: "SDKs", autogenerate: { directory: "sdk" } },
        { label: "Guides — wallee", autogenerate: { directory: "guides" } },
        { label: "Guardrails (AI skills)", collapsed: true, autogenerate: { directory: "guardrails" } },
        { label: "Self-assessment", autogenerate: { directory: "self-assessment" } },
        { label: "Reference", autogenerate: { directory: "reference" } },
      ],
    }),
  ],
});
