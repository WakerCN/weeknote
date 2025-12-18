import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import './index.css';

// 路由懒加载 - 设置页面（非首屏）
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const ApiKeyModel = lazy(() => import('./pages/settings/ApiKeyModel'));
const PromptSettings = lazy(() => import('./pages/settings/PromptSettings'));

// 加载状态组件
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-[#8b949e]">加载中...</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* 设置页面 - 嵌套路由（懒加载） */}
          <Route path="/settings" element={<SettingsLayout />}>
            {/* 默认重定向到 apikey-model */}
            <Route index element={<Navigate to="apikey-model" replace />} />
            <Route path="apikey-model" element={<ApiKeyModel />} />
            <Route path="prompt" element={<PromptSettings />} />
          </Route>
        </Routes>
      </Suspense>
      {/* 全局 Toast 容器 */}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#161b22',
            border: '1px solid #30363d',
            color: '#f0f6fc',
          },
          classNames: {
            toast: 'font-medium',
            success:
              '!bg-[#0d2818] !border-emerald-500/50 !text-emerald-300 [&>svg]:!text-emerald-400',
            error: '!bg-[#2a1215] !border-red-500/50 !text-red-300 [&>svg]:!text-red-400',
            warning:
              '!bg-[#2a2008] !border-yellow-500/50 !text-yellow-300 [&>svg]:!text-yellow-400',
            info: '!bg-[#0d1a2a] !border-blue-500/50 !text-blue-300 [&>svg]:!text-blue-400',
            loading: '!bg-[#1a1a1a] !border-gray-500/50 !text-gray-300',
          },
        }}
        icons={{
          success: <span className="text-emerald-400">✓</span>,
          error: <span className="text-red-400">✗</span>,
          warning: <span className="text-yellow-400">⚠</span>,
          info: <span className="text-blue-400">ℹ</span>,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
