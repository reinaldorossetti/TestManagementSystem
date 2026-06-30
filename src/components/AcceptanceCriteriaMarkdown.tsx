'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AcceptanceCriteriaMarkdownProps {
  markdown: string;
  className?: string;
}

function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="acceptance-table-shell my-8 -mx-1 sm:mx-0">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

export function AcceptanceCriteriaMarkdown({
  markdown,
  className = '',
}: AcceptanceCriteriaMarkdownProps) {
  return (
    <article
      className={`acceptance-markdown max-w-none text-[15px] leading-[1.75] text-slate-700 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 border-b border-slate-200/80 pb-4 text-3xl font-extrabold tracking-tight text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-bold text-slate-900">
              <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-800">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-4 text-slate-600">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
          hr: () => <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />,
          ul: ({ children }) => (
            <ul className="mb-5 ml-1 space-y-2 border-l-2 border-sky-100 pl-5 text-slate-600">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 list-decimal space-y-2 pl-6 text-slate-600 marker:font-mono marker:text-sky-600 marker:font-bold">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white px-5 py-4 text-slate-600 shadow-sm">
              <div className="border-l-4 border-sky-500 pl-4">{children}</div>
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 transition-colors hover:text-sky-900 hover:decoration-sky-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <code className={`font-mono text-[13px] text-sky-100 ${codeClassName ?? ''}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded-md border border-sky-100 bg-sky-50/80 px-1.5 py-0.5 font-mono text-[13px] text-sky-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-6 overflow-x-auto rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-[13px] leading-relaxed text-slate-100 shadow-lg shadow-slate-900/20">
              {children}
            </pre>
          ),
          table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
          thead: ({ children }) => (
            <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-sky-50/40">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-5 py-3.5 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-sky-100/95 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-5 py-3.5 align-top text-slate-700">
              <div className="min-w-[120px] leading-relaxed">{children}</div>
            </td>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ''}
              className="my-6 max-w-full rounded-2xl border border-slate-200 shadow-md"
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
