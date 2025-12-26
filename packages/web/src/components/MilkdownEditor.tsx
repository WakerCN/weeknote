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
 */
const createTaskListInputRulePlugin = $prose(() => {
  // 创建输入规则：匹配行首的 [] 或 [ ] 后跟空格
  const taskListRule = new InputRule(
    /^\s*\[(\s|x|X)?\]\s$/,
    (state, match, start, end) => {
      const { tr, schema } = state;
      const isChecked = match[1]?.toLowerCase() === 'x';
      
      // 获取需要的节点类型
      const listItemType = schema.nodes.list_item;
      const bulletListType = schema.nodes.bullet_list;
      const paragraphType = schema.nodes.paragraph;
      
      if (!listItemType || !bulletListType || !paragraphType) {
        return null;
      }
      
      // 创建一个带有 checked 属性的列表项（任务列表）
      const paragraph = paragraphType.create();
      const listItem = listItemType.create(
        { checked: isChecked },
        paragraph
      );
      const bulletList = bulletListType.create(null, listItem);
      
      // 获取当前行的起始位置
      const $start = state.doc.resolve(start);
      const lineStart = $start.start();
      
      // 替换整行内容为任务列表
      tr.replaceWith(lineStart, end, bulletList);
      
      // 将光标移动到列表项的段落内
      const newPos = lineStart + 3; // bulletList + listItem + paragraph 的偏移
      tr.setSelection(TextSelection.create(tr.doc, newPos));
      
      return tr;
    }
  );

  // 返回 inputRules 插件
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
