'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModelCardMarkdownProps {
  /** Raw markdown content (front matter already stripped) */
  markdown: string;
}

/**
 * Renders a Hugging Face model card with custom styling.
 * Uses react-markdown + GitHub-flavored markdown for tables, strikethrough, etc.
 *
 * Custom element renderers handle code blocks, tables, links, and headings
 * so the model card matches the rest of the app's typography.
 */
export function ModelCardMarkdown({ markdown }: ModelCardMarkdownProps) {
  if (!markdown.trim()) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No model card content available.
      </div>
    );
  }

  return (
    <div className="model-card-markdown text-sm text-slate-700 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-slate-900 mt-4 mb-2">{children}</h4>
          ),
          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-200 pl-4 my-4 text-slate-600 italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block text-xs font-mono whitespace-pre overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs text-slate-700 border-b border-slate-100">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
          img: ({ src, alt }) => {
            if (!src) return null;
            // biome-ignore lint/performance/noImgElement: model card images come from arbitrary remote URLs (Hugging Face uploads). next/image would require allowlisting every author's image domain.
            return <img src={src} alt={alt ?? ''} className="rounded-lg my-4 max-w-full h-auto" />;
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
