import path from 'node:path';

/** Display label after optional TMS namespace prefix (e.g. br.com.../Login Feature). */
export function folderLabelFromPath(folderPath: string): string {
  const trimmed = folderPath.trim();
  if (!trimmed) return 'feature';
  return trimmed.includes('/') ? trimmed.split('/').pop()!.trim() : trimmed;
}

/** URL-safe slug for docs/acceptance/{slug}/criteria.md */
export function folderSlugFromPath(folderPath: string): string {
  const label = folderLabelFromPath(folderPath);
  const slug = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'feature';
}

export function acceptanceDocRepoRelativePath(folderPath: string): string {
  return `docs/acceptance/${folderSlugFromPath(folderPath)}/criteria.md`;
}

export function acceptanceDocWebPath(folderPath: string): string {
  return `/tms/docs/acceptance/${folderSlugFromPath(folderPath)}`;
}

export function acceptanceDocAbsolutePath(projectRoot: string, folderPath: string): string {
  return path.join(projectRoot, acceptanceDocRepoRelativePath(folderPath));
}

export function isMarkdownFileName(name: string): boolean {
  return /\.md$/i.test(name.trim());
}
