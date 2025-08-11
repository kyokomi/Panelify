import React from "react";
import { marked } from "marked";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = "" }) => {
  const htmlContent = marked(content) as string;

  return <div className={`markdown-content ${className}`} dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default MarkdownContent;
