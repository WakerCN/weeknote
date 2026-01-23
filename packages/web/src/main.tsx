import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home/index';
import Auth from './pages/Auth';
import './index.css';

// 路由懒加载：设置页面按需加载，减少首屏体积
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const ApiKeyModel = lazy(() => import('./pages/settings/ApiKeyModel'));
const PromptSettings = lazy(() => import('./pages/settings/PromptSettings'));
const ReminderSettings = lazy(() => import('./pages/settings/ReminderSettings'));
const AccountSettings = lazy(() => import('./pages/settings/AccountSettings'));
const DailyLog = lazy(() => import('./pages/DailyLog/index'));
const PromptPlaza = lazy(() => import('./pages/PromptPlaza/index'));

// 加载中占位组件
function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
      <div className="text-[#8b949e]">加载中...</div>
    </div>
  );
}

// 使用 createBrowserRouter 以支持 View Transitions API
const router = createBrowserRouter([
  {
    path: '/auth',
    element: <Auth />,
  },
  {
    path: '/prompt-plaza',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <PromptPlaza />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: '/daily',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingFallback />}>
          <DailyLog />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/daily/:date',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingFallback />}>
          <DailyLog />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingFallback />}>
          <SettingsLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="apikey-model" replace />,
      },
      {
        path: 'apikey-model',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ApiKeyModel />
          </Suspense>
        ),
      },
      {
        path: 'prompt',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <PromptSettings />
          </Suspense>
        ),
      },
      {
        path: 'reminder',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ReminderSettings />
          </Suspense>
        ),
      },
      {
        path: 'account',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountSettings />
          </Suspense>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
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
    </AuthProvider>
  </React.StrictMode>
);
