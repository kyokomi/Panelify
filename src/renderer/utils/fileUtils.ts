/**
 * ファイルパスからファイル名を抽出（拡張子なし）
 */
export function extractFileNameFromPath(filePath: string): string {
  return filePath.split("/").pop()?.replace(".md", "") || "Unknown";
}

/**
 * ファイルパスからファイル名を抽出（拡張子あり）
 */
export function extractFileNameWithExtension(filePath: string): string {
  return filePath.split("/").pop() || "Unknown";
}

/**
 * ファイルパスから拡張子を取得
 */
export function getFileExtension(filePath: string): string {
  const fileName = extractFileNameWithExtension(filePath);
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";
}
