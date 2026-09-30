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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthResponseSchema } from '@portal/contracts';
import { logout, sessionQueryKey } from '../auth/auth.api';
import { useSession } from '../auth/use-session';
import { useViewPreferences } from '../state/view-preferences';

async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('A API não respondeu corretamente.');
  return healthResponseSchema.parse(await response.json());
}

export function HomePage() {
  const compact = useViewPreferences((state) => state.compact);
  const setCompact = useViewPreferences((state) => state.setCompact);
  const queryClient = useQueryClient();
  const session = useSession();
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(sessionQueryKey, null),
  });
  const health = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <Layout className="page">
      <Layout.Content className={compact ? 'content compact' : 'content'}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
          <div>
            <Typography.Title level={2}>
              Portal de Solicitações Internas
            </Typography.Title>
            <Typography.Text>
              Olá, {session.data?.user.name} (
              {session.data?.user.role === 'AGENT'
                ? 'atendente'
                : 'solicitante'}
              ).
            </Typography.Text>
          </div>
          <Space>
            <Typography.Text>Visualização compacta</Typography.Text>
            <Switch
              checked={compact}
              onChange={setCompact}
              aria-label="Visualização compacta"
            />
            <Button
              onClick={() => signOut.mutate()}
              loading={signOut.isPending}
            >
              Sair
            </Button>
          </Space>
        </Flex>
        {signOut.isError && (
          <Alert
            type="error"
            showIcon
            message={signOut.error.message}
            className="form-alert"
          />
        )}
        <Card
          title="Conexão com a API"
          loading={health.isPending}
          className="status-card"
        >
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
