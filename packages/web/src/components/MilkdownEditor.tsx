/**
 * Milkdown 编辑器组件
 * 基于 Crepe 的所见即所得 Markdown 编辑器
 */

import { useRef, useLayoutEffect, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Crepe } from '@milkdown/crepe';
import { $prose } from '@milkdown/kit/utils';
import { InputRule, inputRules } from '@milkdown/kit/prose/inputrules';
import { TextSelection } from '@milkdown/kit/prose/state';
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

      // 添加自定义插件：[] 转任务列表
      crepe.editor.use(createTaskListInputRulePlugin);

      // 创建编辑器并设置事件监听
      crepe.create().then(() => {
        if (isDestroyedRef.current) return;
        
        crepe.setReadonly(readOnly);
        crepeRef.current = crepe;

        // 使用 on 方法注册事件监听
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown && !isDestroyedRef.current) {
              onChangeRef.current?.(markdown);
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
              return crepeRef.current.getMarkdown();
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
