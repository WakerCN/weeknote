/**
 * 周报生成流程 Hook
 * 管理生成状态、思考过程、结果等
 */
import { useState, useRef, useCallback } from 'react';
import {
  generateReportStream,
  type ThinkingMode,
  type DateRange,
  type ValidationWarning,
} from '@/api';

/**
 * 生成流程状态
 */
interface GenerationState {
  /** 是否正在生成中 */
  isGenerating: boolean;
  /** 是否正在思考中（推理模型专用） */
  isThinking: boolean;
  /** 思考过程内容（推理模型专用） */
  thinkingContent: string;
  /** 思考区域是否展开 */
  isThinkingExpanded: boolean;
  /** 生成的周报内容 */
  report: string;
  /** 使用的模型信息 */
  modelInfo: { id: string; name: string } | null;
  /** 格式校验警告 */
  warnings: ValidationWarning[];
}

/** 初始状态 */
const initialState: GenerationState = {
  isGenerating: false,
  isThinking: false,
  thinkingContent: '',
  isThinkingExpanded: true,
  report: '',
  modelInfo: null,
  warnings: [],
};

/**
 * useGeneration Hook 配置项
 */
interface UseGenerationOptions {
  /** 生成成功回调 */
  onSuccess?: () => void;
  /** 生成失败回调 */
  onError?: (error: Error) => void;
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 开始生成（保留 useCallback，因为有依赖项且是复杂异步函数）
  const generate = useCallback(
    async (params: {
      dailyLog: string;
      modelId: string;
      thinkingMode?: ThinkingMode;
      dateRange?: DateRange;
      isReasoningModel?: boolean;
    }) => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const shouldShowThinking = !!(
        params.isReasoningModel && params.thinkingMode !== 'disabled'
      );

      setState({
        ...initialState,
        isGenerating: true,
        isThinking: shouldShowThinking,
      });

      try {
        const result = await generateReportStream({
          dailyLog: params.dailyLog,
          modelId: params.modelId,
          thinkingMode: params.thinkingMode,
          dateRange: params.dateRange,
          callbacks: {
            onChunk: (chunk) => {
              setState((prev) => ({
                ...prev,
                isThinking: false,
                report: prev.report + chunk,
              }));
            },
            onThinking: shouldShowThinking
              ? (thinking) => {
                  setState((prev) => ({
                    ...prev,
                    thinkingContent: prev.thinkingContent + thinking,
                  }));
                }
              : undefined,
          },
          signal: abortControllerRef.current.signal,
        });

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          isThinking: false,
          modelInfo: result.model,
          warnings: result.warnings || [],
        }));

        abortControllerRef.current = null;
        options.onSuccess?.();
        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          isThinking: false,
        }));

        if ((error as Error).name !== 'AbortError') {
          options.onError?.(error as Error);
        }
        throw error;
      }
    },
    [options]
  );

  // ========== 以下简单函数不再使用 useCallback ==========

  // 取消生成
  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      isThinking: false,
      thinkingContent: '',
    }));
  };

  // 切换思考区域展开/折叠
  const toggleThinkingExpanded = () => {
    setState((prev) => ({
      ...prev,
      isThinkingExpanded: !prev.isThinkingExpanded,
    }));
  };

  // 手动设置报告内容（用于编辑或加载历史）
  const setReport = (report: string) => {
    setState((prev) => ({ ...prev, report }));
  };

  // 设置模型信息（用于加载历史）
  const setModelInfo = (modelInfo: { id: string; name: string } | null) => {
    setState((prev) => ({ ...prev, modelInfo }));
  };

  // 重置状态
  const reset = () => {
    setState(initialState);
  };

  return {
    // 状态
    ...state,
    // 方法
    generate,
    cancel,
    toggleThinkingExpanded,
    setReport,
    setModelInfo,
    reset,
  };
}
