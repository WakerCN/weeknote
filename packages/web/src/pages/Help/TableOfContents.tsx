/**
 * 目录组件
 * 解析 Markdown 标题并生成可点击的目录
 */

import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
}

// 生成标题 ID（用于锚点）
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 替换非字母数字中文字符为连字符
    .replace(/^-+|-+$/g, ''); // 移除首尾连字符
}

// 解析 Markdown 内容，提取所有标题
function parseHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // 匹配 Markdown 标题：#, ##, ### 等
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // 移除可能的 emoji 和特殊字符（仅用于显示）
      const cleanText = text.replace(/^[🚀📅🤖⚙️❓📝🔔👤💡🔒🌐📊🎯✅❌⚠️]/g, '').trim();
      const id = generateHeadingId(text);

      headings.push({
        level,
        text: cleanText || text,
        id,
      });
    }
  }

  return headings;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // 解析标题
  useEffect(() => {
    const parsedHeadings = parseHeadings(content);
    setHeadings(parsedHeadings);
  }, [content]);

  // 监听滚动，高亮当前章节
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      // 找到滚动容器（通过 ID 查找）
      const scrollContainer = document.getElementById('help-content-scroll') as HTMLElement;
      const scrollTop = scrollContainer 
        ? scrollContainer.scrollTop 
        : window.scrollY;
      const offset = 150; // 偏移量，提前高亮

      // 找到当前应该高亮的标题
      let currentId = '';
      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id);
        if (element) {
          // 计算元素相对于滚动容器的位置
          let elementTop = 0;
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            elementTop = elementRect.top - containerRect.top + scrollTop;
          } else {
            elementTop = element.getBoundingClientRect().top + window.scrollY;
          }

          if (elementTop <= scrollTop + offset) {
            currentId = headings[i].id;
            break;
          }
        }
      }

      setActiveId(currentId || headings[0]?.id || '');
    };

    // 延迟一下，确保 DOM 已渲染
    const timer = setTimeout(() => {
      const scrollContainer = document.getElementById('help-content-scroll');
      
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
        handleScroll(); // 初始调用
      } else {
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // 初始调用
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      const scrollContainer = document.getElementById('help-content-scroll');
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [headings]);

  // 点击目录项，滚动到对应位置
  const handleClick = (id: string) => {
    // 等待一下确保 DOM 已渲染
    setTimeout(() => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id "${id}" not found`);
        return;
      }

      // 找到滚动容器（通过 ID 查找）
      const scrollContainer = document.getElementById('help-content-scroll') as HTMLElement;
      const offset = 120; // 顶部偏移量（考虑导航栏高度）

      if (scrollContainer) {
        // 在滚动容器内滚动
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const targetPosition = elementRect.top - containerRect.top + scrollTop - offset;

        scrollContainer.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth',
        });
      } else {
        // 回退到 window 滚动
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }

      // 更新 URL hash
      window.history.pushState(null, '', `#${id}`);
    }, 150);
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="w-64 shrink-0 bg-[#161b22] border-l border-[#30363d] overflow-y-auto">
      <div className="p-4 sticky top-0 bg-[#161b22] border-b border-[#30363d] z-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f0f6fc]">
          <Hash className="w-4 h-4 text-emerald-400" />
          <span>目录</span>
        </div>
      </div>
      <nav className="p-4 space-y-1">
        {headings.map((heading, index) => {
          const isActive = activeId === heading.id;
          const indentClass = {
            1: 'pl-0',
            2: 'pl-4',
            3: 'pl-8',
            4: 'pl-12',
            5: 'pl-16',
            6: 'pl-20',
          }[heading.level] || 'pl-0';

          return (
            <button
              key={`${heading.id}-${index}`}
              onClick={() => handleClick(heading.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${indentClass} ${
                isActive
                  ? 'bg-[#21262d] text-emerald-400 font-medium'
                  : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
              }`}
              title={heading.text}
            >
              <span className="line-clamp-2">{heading.text}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
