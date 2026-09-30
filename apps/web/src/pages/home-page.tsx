import {
  Alert,
  Button,
  Card,
  Flex,
  Layout,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { healthResponseSchema, type ListedRequests } from '@portal/contracts';
import { useNavigate } from 'react-router-dom';
import { logout, sessionQueryKey } from '../auth/auth.api';
import { useSession } from '../auth/use-session';
import { listRequests } from '../requests/requests.api';
import { useViewPreferences } from '../state/view-preferences';

type ListedRequest = ListedRequests[number];

const statusLabels: Record<ListedRequest['status'], string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};

const statusColors: Record<ListedRequest['status'], string> = {
  OPEN: 'blue',
  IN_PROGRESS: 'gold',
  COMPLETED: 'green',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const columns: TableColumnsType<ListedRequest> = [
  { title: 'Código', dataIndex: 'id', render: (id: number) => `#${id}` },
  { title: 'Título', dataIndex: 'title' },
  { title: 'Categoria', dataIndex: ['category', 'name'] },
  { title: 'Solicitante', dataIndex: ['requester', 'name'] },
  {
    title: 'Abertura',
    dataIndex: 'createdAt',
    render: (createdAt: string) => dateFormatter.format(new Date(createdAt)),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status: ListedRequest['status']) => (
      <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
    ),
  },
];

async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('A API não respondeu corretamente.');
  return healthResponseSchema.parse(await response.json());
}

export function HomePage() {
  const navigate = useNavigate();
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
  const requests = useQuery({
    queryKey: ['requests'],
    queryFn: listRequests,
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
            <Button type="primary" onClick={() => navigate('/requests/new')}>
              Nova solicitação
            </Button>
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
        <Card title="Solicitações" className="requests-card">
          {requests.isError ? (
            <Alert
              type="error"
              showIcon
              message={requests.error.message}
              action={
                <Button onClick={() => void requests.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : (
            <Table<ListedRequest>
              rowKey="id"
              columns={columns}
              dataSource={requests.data ?? []}
              loading={requests.isPending}
              locale={{ emptyText: 'Nenhuma solicitação cadastrada.' }}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 740 }}
            />
          )}
        </Card>
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
