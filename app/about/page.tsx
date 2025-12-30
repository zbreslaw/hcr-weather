import { readFile } from "fs/promises";
import path from "path";
import type { ReactNode } from "react";

async function loadAboutMarkdown() {
  const filePath = path.join(process.cwd(), "content", "about.md");
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function renderMarkdown(md: string) {
  const lines = md.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.startsWith("- ")) {
        items.push((lines[i] ?? "").slice(2).trim());
        i += 1;
      }
      blocks.push(
        <ul key={`list-${i}`}>
          {items.map((item, idx) => (
            <li key={`item-${i}-${idx}`}>{item}</li>
          ))}
        </ul>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      const text = headingMatch[2] ?? "";
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      blocks.push(<Tag key={`heading-${i}`}>{text}</Tag>);
      i += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]?.trim() &&
      !lines[i]?.startsWith("- ") &&
      !lines[i]?.match(/^(#{1,3})\s+/)
    ) {
      paragraph.push((lines[i] ?? "").trim());
      i += 1;
    }
    blocks.push(<p key={`para-${i}`}>{paragraph.join(" ")}</p>);
  }

  return blocks;
}

export default async function AboutPage() {
  const md = await loadAboutMarkdown();
  return (
    <main className="container">
      <div className="h1">About This Project</div>
      <div className="panel">
        <div className="panelBody">
          {md ? renderMarkdown(md) : <div className="muted">Add content to `content/about.md`.</div>}
        </div>
      </div>
    </main>
  );
}
