'use client';

interface InlineHeadScriptProps {
  id: string;
  html: string;
}

/** Executes during HTML parsing, then becomes inert when React hydrates the page. */
export default function InlineHeadScript({ id, html }: InlineHeadScriptProps) {
  return (
    <script
      id={id}
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
