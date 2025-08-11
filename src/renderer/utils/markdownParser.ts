import { MarkdownSection } from "../../types/global";

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];
  let currentH1Title = "";

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const currentLine = lines[lineIndex];
    const h1HeaderMatch = currentLine.match(/^(#{1})\s+(.+)$/);
    const h2HeaderMatch = currentLine.match(/^(#{2})\s+(.+)$/);

    if (h1HeaderMatch) {
      currentH1Title = h1HeaderMatch[2];
      continue;
    }

    if (h2HeaderMatch) {
      if (currentSection !== null) {
        currentSection.content = contentBuffer.join("\n").trim();
        sections.push(currentSection);
      }

      const h2Title = h2HeaderMatch[2];
      const combinedTitle = currentH1Title ? `${currentH1Title} - ${h2Title}` : h2Title;
      const uniqueSectionId = `section-${combinedTitle.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "-").toLowerCase()}`;

      currentSection = {
        id: uniqueSectionId,
        title: combinedTitle,
        content: "",
        level: 2,
      };
      contentBuffer = [];
    } else if (currentSection !== null) {
      contentBuffer.push(currentLine);
    }
  }

  if (currentSection !== null) {
    currentSection.content = contentBuffer.join("\n").trim();
    sections.push(currentSection);
  }

  return sections.filter((section) => section.level === 2);
}
