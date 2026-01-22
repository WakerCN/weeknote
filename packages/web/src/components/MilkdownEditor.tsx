/**
 * Milkdown 编辑器组件
 * 基于 Crepe 的所见即所得 Markdown 编辑器
 */

import { useRef, useLayoutEffect, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Crepe } from '@milkdown/crepe';
import { $prose } from '@milkdown/kit/utils';
import { InputRule, inputRules } from '@milkdown/kit/prose/inputrules';
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state';
// 使用 Crepe 原生暗色主题
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame-dark.css';

/**
 * 创建任务列表输入规则的 ProseMirror 插件
 * 支持 [] 或 [ ] + 空格转换为任务列表
 * 
 * 实现思路：
 * 1. 删除匹配的 "[] " 文本
 * 2. 将当前段落包装为任务列表项（设置 checked 属性）
 */
const createTaskListInputRulePlugin = $prose(() => {
  const taskListRule = new InputRule(
    /^\s*\[(\s|x|X)?\] $/,
    (state, match, start, end) => {
      const { tr, schema } = state;
      const isChecked = match[1]?.toLowerCase() === 'x';
      
      const listItemType = schema.nodes.list_item;
      const bulletListType = schema.nodes.bullet_list;
      const paragraphType = schema.nodes.paragraph;
      
      if (!listItemType || !bulletListType || !paragraphType) {
        return null;
      }
      
      // 解析位置
      const $start = state.doc.resolve(start);
      let blockDepth = $start.depth;
      while (blockDepth > 0 && !$start.node(blockDepth).type.isBlock) {
        blockDepth--;
      }
      if (blockDepth === 0) return null;
      
      const blockStart = $start.before(blockDepth);
      const blockEnd = $start.after(blockDepth);
      
      // 获取当前段落除了 "[] " 之外的剩余内容
      const $end = state.doc.resolve(end);
      const contentAfterMatch = $end.parent.cut($end.parentOffset);
      
      // 创建段落内容：如果有剩余文本就用它，否则创建空节点
      const paragraphContent = contentAfterMatch.content.size > 0 
        ? paragraphType.create(null, contentAfterMatch.content)
        : paragraphType.create();
      
      // 创建任务列表结构
      const listItem = listItemType.create({ checked: isChecked }, paragraphContent);
      const bulletList = bulletListType.create(null, listItem);
      
      // 替换整个段落为任务列表
      tr.replaceWith(blockStart, blockEnd, bulletList);
      
      // 将光标移到列表项内容开始处
      tr.setSelection(TextSelection.create(tr.doc, blockStart + 3));
      
      return tr;
    }
  );

  return inputRules({ rules: [taskListRule] });
});

/**
 * 禁用 hardbreak（Shift+Enter 产生的软换行）
 * 
 * 问题：Milkdown 默认会将 Shift+Enter 插入的 hardbreak 节点序列化为 <br /> 标签
 * 解决：让 Shift+Enter 行为与 Enter 一致（插入新段落），从根源避免 <br /> 问题
 */
const disableHardbreakPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('disable-hardbreak'),
    props: {
      handleKeyDown(view, event) {
        if (event.key === 'Enter' && event.shiftKey) {
          // 阻止 Milkdown 默认的 hardbreak 行为
          event.preventDefault();
          const { state, dispatch } = view;
          const { tr, schema } = state;
          // 插入段落分隔（等同于普通 Enter）
          dispatch(tr.replaceSelectionWith(schema.nodes.paragraph.create()).scrollIntoView());
          return true;
        }
        return false;
      },
    },
  });
});

/**
 * 优化列表项的 Backspace 行为
 * 
 * 问题：在空的列表项开头按 Backspace，默认行为是先删除 checkbox，但保持列表缩进
 * 解决：
 * - 在嵌套列表的空列表项中按 Backspace：先提升到父级列表（减少缩进）
 * - 在顶级列表的空列表项中按 Backspace：转换为普通段落
 */
const listItemBackspacePlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('list-item-backspace'),
    props: {
      handleKeyDown(view, event) {
        if (event.key !== 'Backspace') return false;
        
        const { state } = view;
        const { selection } = state;
        
        // 只处理光标选区（非范围选区）
        if (!selection.empty) return false;
        
        const $pos = selection.$from;
        
        // 检查是否在段落开头
        if ($pos.parentOffset !== 0) return false;
        
        // 查找父级列表项
        let listItemDepth = -1;
        for (let d = $pos.depth; d > 0; d--) {
          if ($pos.node(d).type.name === 'list_item') {
            listItemDepth = d;
            break;
          }
        }
        
        // 不在列表项中，交给默认处理
        if (listItemDepth < 0) return false;
        
        const listItem = $pos.node(listItemDepth);
        
        // 检查列表项内容是否为空（只有一个空段落）
        const isEmptyListItem = 
          listItem.childCount === 1 && 
          listItem.firstChild?.type.name === 'paragraph' &&
          listItem.firstChild?.content.size === 0;
        
        if (!isEmptyListItem) return false;
        
        // 找到列表项和列表的位置
        const listItemStart = $pos.before(listItemDepth);
        const listItemEnd = $pos.after(listItemDepth);
        
        // 查找父级列表
        const listDepth = listItemDepth - 1;
        if (listDepth < 1) return false;
        
        const list = $pos.node(listDepth);
        const listStart = $pos.before(listDepth);
        const listEnd = $pos.after(listDepth);
        
        const { tr, schema } = state;
        const paragraphType = schema.nodes.paragraph;
        const listItemType = schema.nodes.list_item;
        
        // 检查是否是嵌套列表（父级是 list_item）
        // 结构：bullet_list > list_item > bullet_list(当前) > list_item(当前)
        let parentListItemDepth = -1;
        for (let d = listDepth - 1; d > 0; d--) {
          if ($pos.node(d).type.name === 'list_item') {
            parentListItemDepth = d;
            break;
          }
        }
        
        if (parentListItemDepth > 0) {
          // 嵌套列表的情况：将当前空列表项提升到父级列表
          // 找到父级列表（包含 parentListItem 的列表）
          const parentListDepth = parentListItemDepth - 1;
          if (parentListDepth < 1) return false;
          
          const parentListItemEnd = $pos.after(parentListItemDepth);
          
          // 创建一个新的空列表项，将插入到父级列表中
          const newListItem = listItemType.create(
            { checked: listItem.attrs.checked },
            paragraphType.create()
          );
          
          if (list.childCount === 1) {
            // 嵌套列表中只有这一个列表项：删除整个嵌套列表，在父级列表项后插入新列表项
            tr.delete(listStart, listEnd);
            tr.insert(parentListItemEnd - (listEnd - listStart), newListItem);
            // 设置光标到新列表项内
            tr.setSelection(TextSelection.create(tr.doc, parentListItemEnd - (listEnd - listStart) + 2));
          } else {
            // 嵌套列表中有多个列表项：只删除当前列表项，在父级列表项后插入新列表项
            tr.delete(listItemStart, listItemEnd);
            const offset = listItemEnd - listItemStart;
            tr.insert(parentListItemEnd - offset, newListItem);
            tr.setSelection(TextSelection.create(tr.doc, parentListItemEnd - offset + 2));
          }
          
          view.dispatch(tr.scrollIntoView());
          return true;
        }
        
        // 顶级列表的情况：转换为普通段落
        if (list.childCount === 1) {
          // 列表中只有一个列表项：替换整个列表为一个空段落（保留这一行）
          tr.replaceWith(listStart, listEnd, paragraphType.create());
          tr.setSelection(TextSelection.create(tr.doc, listStart + 1));
        } else {
          // 列表中有多个列表项：将当前空列表项转换为普通段落
          // 找出当前列表项在列表中的索引
          let listItemIndex = 0;
          let pos = listStart + 1; // 进入列表内部
          for (let i = 0; i < list.childCount; i++) {
            if (pos === listItemStart) {
              listItemIndex = i;
              break;
            }
            pos += list.child(i).nodeSize;
          }
          
          // 创建一个空段落
          const newParagraph = paragraphType.create();
          
          if (listItemIndex === 0) {
            // 第一个列表项：删除该列表项，在列表前插入空段落
            tr.delete(listItemStart, listItemEnd);
            tr.insert(listStart, newParagraph);
            tr.setSelection(TextSelection.create(tr.doc, listStart + 1));
          } else if (listItemIndex === list.childCount - 1) {
            // 最后一个列表项：删除该列表项，在列表后插入空段落
            tr.delete(listItemStart, listItemEnd);
            // 列表结束位置需要重新计算（因为删除了一个列表项）
            const newListEnd = listEnd - (listItemEnd - listItemStart);
            tr.insert(newListEnd, newParagraph);
            tr.setSelection(TextSelection.create(tr.doc, newListEnd + 1));
          } else {
            // 中间的列表项：需要拆分列表
            // 1. 删除当前列表项
            // 2. 在该位置插入空段落
            // 这会导致列表被拆分为两个列表，中间是一个段落
            tr.delete(listItemStart, listItemEnd);
            tr.insert(listItemStart, newParagraph);
            tr.setSelection(TextSelection.create(tr.doc, listItemStart + 1));
          }
        }
        
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    },
  });
});

/**
 * 链接边缘输入优化插件
 * 
 * 问题：在链接文字的开头或结尾输入时，新输入的字符会被包含在链接中
 * 解决：检测光标是否在链接 mark 的边缘，如果是则清除 storedMarks 中的链接 mark
 */
const linkBoundaryPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('link-boundary'),
    props: {
      handleTextInput(view, from, to) {
        const { state } = view;
        const { schema } = state;
        const linkMark = schema.marks.link;
        
        if (!linkMark) return false;
        
        // 只处理光标位置（非范围选区）
        if (from !== to) return false;
        
        const $pos = state.doc.resolve(from);
        
        // 获取当前位置的 marks
        const marks = $pos.marks();
        const hasLink = marks.some((m: { type: typeof linkMark }) => m.type === linkMark);
        
        if (!hasLink) return false;
        
        // 检查是否在链接边缘
        // 在开头：前一个位置没有链接 mark
        let isAtStart = false;
        if ($pos.parentOffset === 0) {
          isAtStart = true;
        } else if (from > 1) {
          const prevMarks = state.doc.resolve(from - 1).marks();
          isAtStart = !prevMarks.some((m: { type: typeof linkMark }) => m.type === linkMark);
        }
        
        // 在结尾：后一个位置没有链接 mark
        let isAtEnd = false;
        if ($pos.parentOffset === $pos.parent.content.size) {
          isAtEnd = true;
        } else if (from < state.doc.content.size - 1) {
          const nextMarks = state.doc.resolve(from + 1).marks();
          isAtEnd = !nextMarks.some((m: { type: typeof linkMark }) => m.type === linkMark);
        }
        
        // 如果在边缘，清除链接 mark
        if (isAtStart || isAtEnd) {
          // 获取当前所有 marks，移除链接 mark
          const newMarks = marks.filter((m: { type: typeof linkMark }) => m.type !== linkMark);
          const tr = state.tr.setStoredMarks(newMarks);
          view.dispatch(tr);
        }
        
        return false; // 返回 false 让默认行为继续
      },
    },
  });
});

/**
 * 清理 Markdown 中的 <br /> 标签
 * Milkdown 在某些情况下会将换行序列化为 <br /> 标签，这里统一转换为换行符
 */
const cleanBrTags = (markdown: string): string => {
  return markdown.replace(/<br\s*\/?>/gi, '\n');
};

interface MilkdownEditorProps {
  /** 初始内容 */
  defaultValue?: string;
  /** 内容变更回调 */
  onChange?: (markdown: string) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 最小高度 */
  minHeight?: string;
  /** 编辑器类名 */
  className?: string;
}

export interface MilkdownEditorRef {
  /** 获取 Markdown 内容 */
  getMarkdown: () => string;
  /** 聚焦编辑器 */
  focus: () => void;
}

export const MilkdownEditor = forwardRef<MilkdownEditorRef, MilkdownEditorProps>(
  (
    {
      defaultValue = '',
      onChange,
      readOnly = false,
      placeholder = '开始输入...',
      minHeight = '120px',
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);
    const onChangeRef = useRef(onChange);
    const isDestroyedRef = useRef(false);

    // 保持 onChange 引用最新
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useLayoutEffect(() => {
      if (!containerRef.current) return;

      isDestroyedRef.current = false;

      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue: defaultValue || '',
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: placeholder,
            mode: 'doc', // 文档为空时显示placeholder
          },
        },
      });

      // 添加自定义插件
      crepe.editor
        .use(createTaskListInputRulePlugin)  // [] 转任务列表
        .use(disableHardbreakPlugin)         // 禁用 Shift+Enter 的 hardbreak，避免 <br /> 问题
        .use(listItemBackspacePlugin)        // 优化空列表项的 Backspace 行为
        .use(linkBoundaryPlugin);            // 链接边缘输入优化

      // 创建编辑器并设置事件监听
      crepe.create().then(() => {
        if (isDestroyedRef.current) return;
        
        crepe.setReadonly(readOnly);
        crepeRef.current = crepe;

        // 使用 on 方法注册事件监听
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown && !isDestroyedRef.current) {
              // 清理可能存在的 <br /> 标签，确保输出干净的 Markdown
              onChangeRef.current?.(cleanBrTags(markdown));
            }
          });
        });
      });

      return () => {
        isDestroyedRef.current = true;
        crepeRef.current = null;
        // 延迟销毁，确保所有异步操作完成
        setTimeout(() => {
          crepe.destroy().catch(() => {
            // 忽略销毁时的错误
          });
        }, 0);
      };
    }, []); // 只在挂载时初始化一次

    // 当 readOnly 变化时更新
    useEffect(() => {
      if (crepeRef.current && !isDestroyedRef.current) {
        crepeRef.current.setReadonly(readOnly);
      }
    }, [readOnly]);

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () => {
          if (crepeRef.current && !isDestroyedRef.current) {
            try {
              // 清理可能存在的 <br /> 标签
              return cleanBrTags(crepeRef.current.getMarkdown());
            } catch {
              return '';
            }
          }
          return '';
        },
        focus: () => {
          // Milkdown 编辑器聚焦
          containerRef.current?.querySelector<HTMLElement>('[contenteditable]')?.focus();
        },
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={`milkdown-editor-container ${className}`}
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
    );
  }
);

MilkdownEditor.displayName = 'MilkdownEditor';

export default MilkdownEditor;
