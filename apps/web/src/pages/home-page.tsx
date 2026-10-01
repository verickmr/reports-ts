import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  healthResponseSchema,
  type ListedRequests,
  type ListRequestsQuery,
} from '@portal/contracts';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, sessionQueryKey } from '../auth/auth.api';
import { useSession } from '../auth/use-session';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { getRequestSummary, listRequests } from '../requests/requests.api';
import { statusColors, statusLabels } from '../requests/request-status';
import { useViewPreferences } from '../state/view-preferences';

type ListedRequest = ListedRequests[number];
type RequestFilterForm = {
  title?: string;
  categoryId?: number;
  status?: ListRequestsQuery['status'];
  fromDate?: string;
  toDate?: string;
};

function localDayStart(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function nextLocalDayStart(date: string): Date {
  const next = localDayStart(date);
  next.setDate(next.getDate() + 1);
  return next;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const columns: TableColumnsType<ListedRequest> = [
  {
    title: 'Código',
    dataIndex: 'id',
    render: (id: number) => <Link to={`/requests/${id}`}>#{id}</Link>,
  },
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
  const [filterForm] = Form.useForm<RequestFilterForm>();
  const [filters, setFilters] = useState<ListRequestsQuery>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  const categories = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
  });
  const requests = useQuery({
    queryKey: ['requests', filters, page, pageSize],
    queryFn: () => listRequests({ ...filters, page, pageSize }),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const summary = useQuery({
    queryKey: ['requests', 'summary'],
    queryFn: getRequestSummary,
    retry: false,
  });

  useEffect(() => {
    if (!requests.data || requests.isPlaceholderData) return;
    const lastPage = Math.max(1, Math.ceil(requests.data.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [page, pageSize, requests.data, requests.isPlaceholderData]);

  function applyFilters(values: RequestFilterForm) {
    if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
      filterForm.setFields([
        {
          name: 'toDate',
          errors: ['A data final deve ser igual ou posterior à inicial.'],
        },
      ]);
      return;
    }
    setFilters({
      title: values.title?.trim() || undefined,
      categoryId: values.categoryId,
      status: values.status,
      createdFrom: values.fromDate
        ? localDayStart(values.fromDate).toISOString()
        : undefined,
      createdBefore: values.toDate
        ? nextLocalDayStart(values.toDate).toISOString()
        : undefined,
    });
    setPage(1);
  }

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
        <Card
          title="Resumo das solicitações"
          loading={summary.isPending}
          className="requests-card"
        >
          {summary.isError && (
            <Alert
              type="error"
              showIcon
              message={summary.error.message}
              action={
                <Button onClick={() => void summary.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          )}
          {summary.isSuccess && (
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <Statistic title="Total" value={summary.data.total} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Abertas" value={summary.data.byStatus.OPEN} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Em andamento"
                  value={summary.data.byStatus.IN_PROGRESS}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Concluídas"
                  value={summary.data.byStatus.COMPLETED}
                />
              </Col>
            </Row>
          )}
        </Card>
        <Card title="Solicitações" className="requests-card">
          {categories.isError && (
            <Alert
              type="error"
              showIcon
              message={categories.error.message}
              className="form-alert"
              action={
                <Button onClick={() => void categories.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          )}
          <Form<RequestFilterForm>
            form={filterForm}
            layout="vertical"
            onFinish={applyFilters}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Título" name="title">
                  <Input placeholder="Buscar pelo título" maxLength={150} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Categoria" name="categoryId">
                  <Select
                    allowClear
                    placeholder="Todas"
                    loading={categories.isPending}
                    disabled={!categories.isSuccess}
                    options={categories.data?.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Status" name="status">
                  <Select
                    allowClear
                    placeholder="Todos"
                    options={Object.entries(statusLabels).map(
                      ([value, label]) => ({
                        value,
                        label,
                      }),
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Abertura de" name="fromDate">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Abertura até" name="toDate">
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label=" ">
                  <Space>
                    <Button type="primary" htmlType="submit">
                      Aplicar filtros
                    </Button>
                    <Button
                      onClick={() => {
                        filterForm.resetFields();
                        setFilters({});
                        setPage(1);
                      }}
                    >
                      Limpar
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
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
              dataSource={requests.data?.items ?? []}
              loading={requests.isFetching}
              locale={{ emptyText: 'Nenhuma solicitação cadastrada.' }}
              pagination={{
                current: page,
                pageSize,
                total: requests.data?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPageSize === pageSize ? nextPage : 1);
                  setPageSize(nextPageSize);
                },
              }}
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
