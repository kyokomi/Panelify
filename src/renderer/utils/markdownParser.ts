import { MarkdownSection } from '../../types/global';

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];
  let currentH1Title = '';

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const h1Match = line.match(/^(#{1})\s+(.+)$/);
    const h2Match = line.match(/^(#{2})\s+(.+)$/);
    
    if (h1Match) {
      // h1見出しが見つかったら、次のh2見出しのプレフィックスとして記録
      currentH1Title = h1Match[2];
      continue;
    } else if (h2Match) {
      // 前のセクションを保存
      if (currentSection !== null) {
        currentSection.content = contentBuffer.join('\n').trim();
        sections.push(currentSection);
      }
      
      const title = h2Match[2];
      const fullTitle = currentH1Title ? `${currentH1Title} - ${title}` : title;
      
      // タイトルを元に一貫性のあるIDを生成（日本語も考慮）
      const stableId = `section-${fullTitle.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-').toLowerCase()}`;
      
      currentSection = {
        id: stableId,
        title: fullTitle,
        content: '',
        level: 2
      };
      contentBuffer = [];
    } else if (currentSection !== null) {
      contentBuffer.push(line);
    }
  }

  if (currentSection !== null) {
    currentSection.content = contentBuffer.join('\n').trim();
    sections.push(currentSection);
  }

  return sections.filter(section => section.level === 2);
}