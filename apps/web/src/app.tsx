import {
  Alert,
  Button,
  Card,
  Flex,
  Layout,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { create } from 'zustand';
import { healthResponseSchema } from '@portal/contracts';

type ViewPreferences = {
  compact: boolean;
  setCompact: (compact: boolean) => void;
};

const useViewPreferences = create<ViewPreferences>((set) => ({
  compact: false,
  setCompact: (compact) => set({ compact }),
}));

async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('A API não respondeu corretamente.');
  return healthResponseSchema.parse(await response.json());
}

function Home() {
  const compact = useViewPreferences((state) => state.compact);
  const setCompact = useViewPreferences((state) => state.setCompact);
  const health = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <Layout className="page">
      <Layout.Content className={compact ? 'content compact' : 'content'}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
          <Typography.Title level={2}>
            Portal de Solicitações Internas
          </Typography.Title>
          <Space>
            <Typography.Text>Visualização compacta</Typography.Text>
            <Switch
              checked={compact}
              onChange={setCompact}
              aria-label="Visualização compacta"
            />
          </Space>
        </Flex>
        <Card title="Conexão com a API" loading={health.isPending}>
          {health.isSuccess && (
            <Alert
              type="success"
              showIcon
              message="Frontend e API conectados"
              description="O contrato compartilhado foi validado com Zod."
            />
          )}
          {health.isError && (
            <Alert
              type="error"
              showIcon
              message="Não foi possível consultar a API"
              description={health.error.message}
              action={
                <Button onClick={() => void health.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          )}
        </Card>
      </Layout.Content>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
