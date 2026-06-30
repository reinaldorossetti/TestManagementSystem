'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Clock,
  ExternalLink,
  Film,
  ImageIcon,
  Link2,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/src/lib/api/client';
import type { DbTestCaseEvidenceBundle, DbTestCaseEvidenceItem } from '@/src/utils/sqliteEngine';

interface TestCaseEvidenceTabProps {
  testCaseId: string;
  t?: (pt: string, en: string) => string;
}

type UploadMode = 'file' | 'link';

const tr = (t: TestCaseEvidenceTabProps['t'], pt: string, en: string) => (t ? t(pt, en) : pt);

const SOURCE_LABELS: Record<string, { pt: string; en: string }> = {
  automated: { pt: 'Automatizada', en: 'Automated' },
  manual: { pt: 'Manual', en: 'Manual' },
};

export function TestCaseEvidenceTab({ testCaseId, t }: TestCaseEvidenceTabProps) {
  const [bundle, setBundle] = useState<DbTestCaseEvidenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<UploadMode>('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTestCaseEvidence(testCaseId);
      setBundle(data);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Falha ao carregar evidências.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [testCaseId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await apiClient.uploadTestCaseEvidence(testCaseId, file);
      await loadEvidence();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Falha ao enviar evidência.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await apiClient.addTestCaseEvidenceLink(testCaseId, linkUrl.trim(), linkTitle.trim() || undefined);
      setLinkUrl('');
      setLinkTitle('');
      await loadEvidence();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Falha ao salvar link.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: DbTestCaseEvidenceItem) => {
    if (item.source !== 'manual') return;
    if (!window.confirm(tr(t, 'Excluir esta evidência manual?', 'Delete this manual evidence?'))) return;
    try {
      await apiClient.deleteTestCaseEvidence(testCaseId, item.id);
      await loadEvidence();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Falha ao excluir evidência.';
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin" />
        {tr(t, 'Carregando evidências...', 'Loading evidence...')}
      </div>
    );
  }

  const latest = bundle?.latest ?? null;
  const items = bundle?.items ?? [];

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* Latest evidence hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            {tr(t, 'Última evidência', 'Latest evidence')}
          </span>
          {latest && (
            <span
              className={`rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                latest.source === 'automated'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {tr(t, SOURCE_LABELS[latest.source]?.pt ?? latest.source, SOURCE_LABELS[latest.source]?.en ?? latest.source)}
            </span>
          )}
        </div>

        <div className="p-4">
          {!latest ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {tr(t, 'Nenhuma evidência registrada ainda.', 'No evidence recorded yet.')}
              </p>
            </div>
          ) : (
            <EvidencePreview item={latest} t={t} large />
          )}
        </div>
      </section>

      {/* Manual upload */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-3">
          {tr(t, 'Adicionar evidência (teste manual)', 'Add evidence (manual test)')}
        </h3>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 rounded-xl border py-2 text-[11px] font-mono font-bold transition-colors ${
              mode === 'file'
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-slate-200 text-slate-600 hover:border-sky-400'
            }`}
          >
            <Upload className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {tr(t, 'Arquivo', 'File')}
          </button>
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 rounded-xl border py-2 text-[11px] font-mono font-bold transition-colors ${
              mode === 'link'
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-slate-200 text-slate-600 hover:border-sky-400'
            }`}
          >
            <Link2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {tr(t, 'Link', 'Link')}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />

        {mode === 'file' ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-mono font-bold text-sky-700 hover:border-sky-500 hover:bg-sky-50/50 transition-colors disabled:opacity-50"
          >
            {uploading
              ? tr(t, 'Enviando...', 'Uploading...')
              : tr(t, 'Selecionar imagem ou vídeo', 'Select image or video')}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={tr(t, 'https://teams.microsoft.com/...', 'https://teams.microsoft.com/...')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-sky-500 focus:outline-none"
            />
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder={tr(t, 'Título opcional', 'Optional title')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={uploading || !linkUrl.trim()}
              onClick={() => void handleLinkSubmit()}
              className="rounded-xl border border-sky-500 bg-sky-600 py-2 text-xs font-mono font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {uploading ? tr(t, 'Salvando...', 'Saving...') : tr(t, 'Salvar link', 'Save link')}
            </button>
          </div>
        )}
      </section>

      {/* History */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-3">
            {tr(t, 'Histórico', 'History')} ({items.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon type={item.evidence_type} />
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {item.label || item.title}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                        item.source === 'automated'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {tr(t, SOURCE_LABELS[item.source]?.pt ?? item.source, SOURCE_LABELS[item.source]?.en ?? item.source)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <time className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      {item.created_at}
                    </time>
                    {item.source === 'manual' && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="rounded-lg border border-slate-200 p-1 text-red-500 hover:border-red-400"
                        title={tr(t, 'Excluir', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <EvidencePreview item={item} t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-mono text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: DbTestCaseEvidenceItem['evidence_type'] }) {
  if (type === 'video') return <Film className="w-3.5 h-3.5 text-violet-600" />;
  if (type === 'link') return <Link2 className="w-3.5 h-3.5 text-sky-600" />;
  return <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />;
}

function EvidencePreview({
  item,
  t,
  large = false,
}: {
  item: DbTestCaseEvidenceItem;
  t?: TestCaseEvidenceTabProps['t'];
  large?: boolean;
}) {
  if (item.evidence_type === 'link' && item.external_url) {
    return (
      <a
        href={item.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-sky-700 hover:border-sky-500"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {item.title || item.external_url}
      </a>
    );
  }

  if (item.evidence_type === 'video') {
    return (
      <video
        src={item.preview_url}
        controls
        className={`max-w-full rounded-xl border border-slate-200 bg-black ${large ? 'max-h-80' : 'max-h-40'}`}
      />
    );
  }

  return (
    <a href={item.preview_url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={item.preview_url}
        alt={item.title}
        className={`max-w-full rounded-xl border border-slate-200 object-contain bg-slate-950/5 ${
          large ? 'max-h-96' : 'max-h-36'
        }`}
      />
    </a>
  );
}
