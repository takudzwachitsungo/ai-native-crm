import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';

interface ChatMarkdownProps {
  content: string;
  compact?: boolean;
  className?: string;
}

export function ChatMarkdown({ content, compact = false, className }: ChatMarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none text-foreground',
        'prose-strong:font-semibold prose-strong:text-foreground',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        compact ? 'leading-relaxed' : 'leading-6',
        className
      )}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className={cn('font-semibold tracking-tight', compact ? 'mb-2 text-base' : 'mb-3 text-lg')}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn('font-semibold tracking-tight', compact ? 'mt-3 mb-2 text-sm' : 'mt-4 mb-2 text-base')}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn('font-semibold', compact ? 'mt-2 mb-1 text-sm' : 'mt-3 mb-1.5 text-sm')}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={cn('text-foreground/95', compact ? 'mb-2 last:mb-0' : 'my-3 first:mt-0 last:mb-0')}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className={cn('list-disc pl-6 marker:text-muted-foreground', compact ? 'my-2 space-y-1' : 'my-3 space-y-2')}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={cn(
                'list-decimal pl-6 marker:font-semibold marker:text-muted-foreground',
                compact ? 'my-2 space-y-1' : 'my-3 space-y-2'
              )}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.8em] text-foreground">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
