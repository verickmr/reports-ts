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
import { type ListedRequests, type ListRequestsQuery } from '@portal/contracts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logout, sessionQueryKey } from '../auth/auth.api';
import { useSession } from '../auth/use-session';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { getRequestSummary, listRequests } from '../requests/requests.api';
import { statusColors, statusLabels } from '../requests/request-status';
import { CreateRequestModal } from '../requests/create-request-modal';
import { useThemePreference } from '../state/theme-preference';

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

export function HomePage() {
  const [filterForm] = Form.useForm<RequestFilterForm>();
  const [filters, setFilters] = useState<ListRequestsQuery>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  const mode = useThemePreference((state) => state.mode);
  const toggleMode = useThemePreference((state) => state.toggleMode);
  const queryClient = useQueryClient();
  const session = useSession();
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(sessionQueryKey, null),
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
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span>Solicitações</span>
          </div>
          <Flex align="center" gap="middle">
            <span className="user-name">{session.data?.user.name}</span>
            <Button
              onClick={toggleMode}
              aria-label={
                mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
              }
            >
              {mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </Button>
            <Button
              onClick={() => signOut.mutate()}
              loading={signOut.isPending}
            >
              Sair
            </Button>
          </Flex>
        </div>
      </header>
      <Layout.Content className="content">
        <div className="page-heading">
          <div>
            <Typography.Text className="eyebrow">
              PAINEL DE ACOMPANHAMENTO
            </Typography.Text>
            <Typography.Title level={1}>Solicitações</Typography.Title>
            <Typography.Paragraph>
              Acompanhe demandas, consulte o andamento e registre uma nova
              solicitação.
            </Typography.Paragraph>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={() => setCreateOpen(true)}
          >
            Nova solicitação
          </Button>
        </div>
        {signOut.isError && (
          <Alert
            type="error"
            showIcon
            message={signOut.error.message}
            className="form-alert"
          />
        )}
        {createdRequestId !== null && (
          <Alert
            type="success"
            showIcon
            closable
            onClose={() => setCreatedRequestId(null)}
            message={`Solicitação #${createdRequestId} criada com sucesso.`}
            description={
              <Link to={`/requests/${createdRequestId}`}>Ver solicitação</Link>
            }
            className="requests-card"
          />
        )}
        <section className="overview" aria-label="Resumo das solicitações">
          <Typography.Title level={4}>Visão geral</Typography.Title>
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
          <div className="summary-grid">
            <Card className="summary-card total" loading={summary.isPending}>
              <Statistic title="Total" value={summary.data?.total ?? 0} />
            </Card>
            <Card className="summary-card open" loading={summary.isPending}>
              <Statistic
                title="Abertas"
                value={summary.data?.byStatus.OPEN ?? 0}
              />
            </Card>
            <Card className="summary-card progress" loading={summary.isPending}>
              <Statistic
                title="Em andamento"
                value={summary.data?.byStatus.IN_PROGRESS ?? 0}
              />
            </Card>
            <Card
              className="summary-card completed"
              loading={summary.isPending}
            >
              <Statistic
                title="Concluídas"
                value={summary.data?.byStatus.COMPLETED ?? 0}
              />
            </Card>
          </div>
        </section>
        <Card title="Todas as solicitações" className="requests-card">
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
      </Layout.Content>
      {createOpen && (
        <CreateRequestModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreatedRequestId(id);
            setCreateOpen(false);
          }}
        />
      )}
    </Layout>
  );
}
