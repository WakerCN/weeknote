import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Settings from './pages/Settings';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
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
            success: '!border-emerald-500/50 !text-emerald-400 [&>svg]:!text-emerald-400',
            error: '!border-red-500/50 !text-red-400 [&>svg]:!text-red-400',
            warning: '!border-yellow-500/50 !text-yellow-400 [&>svg]:!text-yellow-400',
            info: '!border-blue-500/50 !text-blue-400 [&>svg]:!text-blue-400',
            loading: '!border-gray-500/50 !text-gray-400',
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
