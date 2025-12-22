/**
 * 页面过渡导航工具
 * 封装 View Transitions API，提供带过渡效果的导航功能
 */

import { useNavigate, Link, type LinkProps, type To } from 'react-router-dom';
import { useCallback } from 'react';

type TransitionScope = 'none' | 'root';

type TransitionNavigateOptions = {
  replace?: boolean;
  state?: unknown;
  /** 默认 none；需要整页过渡（如主页 <-> 设置）时传 root */
  scope?: TransitionScope;
};

const ROOT_TRANSITION_CLEANUP_MS = 400;

function enableRootTransitionTemporarily() {
  const docEl = document.documentElement;
  docEl.dataset.vtRoot = '1';
  window.setTimeout(() => {
    delete docEl.dataset.vtRoot;
  }, ROOT_TRANSITION_CLEANUP_MS);
}

/**
 * 带过渡效果的 navigate hook
 *
 * @example
 * const navigate = useTransitionNavigate();
 * navigate('/settings');
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: TransitionNavigateOptions) => {
      const scope = options?.scope ?? 'none';

      if (scope === 'root') {
        enableRootTransitionTemporarily();
      }

      // 交给 React Router 处理 viewTransition（内部会做必要的同步提交以保证稳定）
      navigate(to, {
        replace: options?.replace,
        state: options?.state,
        viewTransition: true,
      });
    },
    [navigate]
  );
}

/**
 * 带过渡效果的 Link 组件
 *
 * @example
 * <TransitionLink to="/settings">设置</TransitionLink>
 */
export function TransitionLink(
  props: LinkProps & {
    /** 默认 none；需要整页过渡（如主页 <-> 设置）时传 root */
    scope?: TransitionScope;
  }
) {
  const { onClick, scope = 'none', ...rest } = props;

  return (
    <Link
      {...rest}
      viewTransition
      onClick={(e) => {
        if (scope === 'root') {
          enableRootTransitionTemporarily();
        }
        onClick?.(e);
      }}
    />
  );
}
