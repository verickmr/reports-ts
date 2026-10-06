import React, { useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { App } from './app';
import { useThemePreference } from './state/theme-preference';
import './styles.css';
import './ui.css';

const queryClient = new QueryClient();

function Root() {
  const mode = useThemePreference((state) => state.mode);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        algorithm:
          mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: mode === 'dark' ? '#8dadff' : '#3155b5',
          colorText: mode === 'dark' ? '#eef3ff' : '#17253f',
          colorTextSecondary: mode === 'dark' ? '#a7b3c8' : '#63708a',
          colorBorder: mode === 'dark' ? '#2d3a51' : '#dce2ed',
          colorBgLayout: mode === 'dark' ? '#0d1525' : '#f5f7fb',
          colorBgContainer: mode === 'dark' ? '#162236' : '#fff',
          borderRadius: 12,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
