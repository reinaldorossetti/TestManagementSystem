import { notFound } from 'next/navigation';
import { AcceptanceDocEditor } from '@/src/components/AcceptanceDocEditor';
import {
  findFolderPathBySlug,
  getAcceptanceDocForFolder,
  getAcceptanceDocHistory,
  readAcceptanceMarkdown,
} from '@/src/server/services/folderAcceptanceDocService';
import { folderLabelFromPath } from '@/src/utils/acceptanceDocPaths';

interface AcceptanceDocPageProps {
  params: Promise<{ folderSlug: string }>;
}

export default async function AcceptanceDocPage({ params }: AcceptanceDocPageProps) {
  const { folderSlug } = await params;
  const folderPath = await findFolderPathBySlug(folderSlug);
  if (!folderPath) notFound();

  const doc = await getAcceptanceDocForFolder(folderPath);
  if (!doc) notFound();

  const [markdown, history] = await Promise.all([
    readAcceptanceMarkdown(folderPath),
    getAcceptanceDocHistory(folderPath),
  ]);
  const featureLabel = folderLabelFromPath(folderPath);

  return (
    <AcceptanceDocEditor
      folderPath={folderPath}
      featureLabel={featureLabel}
      initialDoc={doc}
      initialMarkdown={markdown}
      initialHistory={history}
    />
  );
}
