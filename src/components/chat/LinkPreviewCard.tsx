"use client";

import React from 'react';
import { ExternalLink, Globe, Copy, Check } from 'lucide-react';

interface LinkPreviewCardProps {
  url: string;
}

export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
};

export default function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [copied, setCopied] = React.useState(false);

  let hostname = '';
  let pathname = '';
  let serviceName = 'Web link';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, '');
    pathname = parsed.pathname;

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      serviceName = 'YouTube Video';
      badgeColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400';
    } else if (hostname.includes('github.com')) {
      serviceName = 'GitHub Repository';
      badgeColor = 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900';
    } else if (hostname.includes('figma.com')) {
      serviceName = 'Figma Design';
      badgeColor = 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400';
    } else if (hostname.includes('google.com') && pathname.includes('docs')) {
      serviceName = 'Google Docs';
      badgeColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400';
    } else if (hostname.includes('drive.google.com')) {
      serviceName = 'Google Drive';
      badgeColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400';
    } else if (hostname.includes('meet.jit.si') || hostname.includes('zoom.us') || hostname.includes('meet.google.com')) {
      serviceName = 'Trực tuyến Video Call';
      badgeColor = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400';
    }
  } catch {
    return null;
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-2.5 max-w-sm text-left shadow-2xs hover:shadow-xs transition-all">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${badgeColor}`}>
          <Globe className="w-3 h-3" />
          {serviceName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Sao chép liên kết"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
            title="Mở liên kết trong tab mới"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {hostname}{pathname.length > 1 ? pathname : ''}
        </div>
        <div className="text-[9.5px] text-slate-400 font-mono truncate mt-0.5">
          {url}
        </div>
      </a>
    </div>
  );
}
