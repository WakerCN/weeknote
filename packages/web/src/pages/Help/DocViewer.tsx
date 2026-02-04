/**
 * Markdown 文档渲染组件
 * 支持代码高亮、图片、表格等 Markdown 特性
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocViewerProps {
  content: string;
}

// 生成标题 ID（用于锚点）
// 与 TableOfContents 中的 generateHeadingId 保持一致
function generateHeadingId(text: string): string {
  // 移除 emoji 和特殊字符
  const cleanText = text
    .replace(/^[🚀📅🤖⚙️❓📝🔔👤💡🔒🌐📊🎯✅❌⚠️]/g, '') // 移除开头的 emoji
    .trim();
  
  return cleanText
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 替换非字母数字中文字符为连字符
    .replace(/^-+|-+$/g, ''); // 移除首尾连字符
}

// 提取文本内容的辅助函数（从 ReactNode 中提取纯文本）
function extractText(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children
      .map(c => {
        if (typeof c === 'string') return c;
        if (typeof c === 'object' && c !== null && 'props' in c) {
          return extractText(c.props?.children || '');
        }
        return '';
      })
      .join('');
  }
  if (typeof children === 'object' && children !== null && 'props' in children) {
    return extractText(children.props?.children || '');
  }
  return String(children || '');
}

export default function DocViewer({ content }: DocViewerProps) {
  return (
    <div className="prose prose-invert prose-lg max-w-none prose-headings:text-[#f0f6fc] prose-p:text-[#c9d1d9] prose-strong:text-[#f0f6fc] prose-code:text-emerald-400 prose-code:bg-[#161b22] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d] prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-a:transition-colors prose-blockquote:border-l-emerald-500 prose-blockquote:text-[#8b949e] prose-ul:text-[#c9d1d9] prose-ol:text-[#c9d1d9] prose-li:text-[#c9d1d9]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 为标题添加 id 属性，用于锚点跳转
          h1: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h1 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h1>
            );
          },
          h2: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h2 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h2>
            );
          },
          h3: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h3 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h3>
            );
          },
          h4: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h4 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h4>
            );
          },
          h5: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h5 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h5>
            );
          },
          h6: ({ node, children, ...props }: any) => {
            const text = extractText(children);
            const id = generateHeadingId(text);
            return (
              <h6 id={id} className="scroll-mt-20" {...props}>
                {children}
              </h6>
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !bg-[#161b22] !border !border-[#30363d]"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="rounded-lg shadow-lg border border-[#30363d] my-4"
              loading="lazy"
            />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-[#30363d]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[#30363d] bg-[#161b22] px-4 py-2 text-left text-[#f0f6fc] font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#30363d] px-4 py-2 text-[#c9d1d9]">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
