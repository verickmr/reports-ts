import { useQuery } from '@tanstack/react-query';
import { requestIdSchema } from '@portal/contracts';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Layout,
  Tag,
  Typography,
} from 'antd';
import { Link, useParams } from 'react-router-dom';
import { getRequestDetail } from '../requests/requests.api';
import { statusColors, statusLabels } from '../requests/request-status';
import { RequestStatusEditor } from '../requests/request-status-editor';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function RequestDetailContent({ id }: { id: number }) {
  const detail = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequestDetail(id),
    retry: false,
  });

  return (
    <Card
      title={`Solicitação #${id}`}
      loading={detail.isPending}
      className="detail-card"
    >
      {detail.isError && (
        <Alert
          type="error"
          showIcon
          message={detail.error.message}
          action={
            <Button onClick={() => void detail.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      )}
      {detail.isSuccess && (
        <>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Título">
              {detail.data.title}
            </Descriptions.Item>
            <Descriptions.Item label="Descrição">
              <Typography.Paragraph
                style={{ whiteSpace: 'pre-wrap', margin: 0 }}
              >
                {detail.data.description}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Categoria">
              {detail.data.category.name}
            </Descriptions.Item>
            <Descriptions.Item label="Solicitante">
              {detail.data.requester.name}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[detail.data.status]}>
                {statusLabels[detail.data.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Abertura">
              {dateFormatter.format(new Date(detail.data.createdAt))}
            </Descriptions.Item>
            <Descriptions.Item label="Última atualização">
              {dateFormatter.format(new Date(detail.data.updatedAt))}
            </Descriptions.Item>
          </Descriptions>
          <Divider />
          <RequestStatusEditor request={detail.data} />
        </>
      )}
    </Card>
  );
}

export function RequestDetailPage() {
  const { id } = useParams();
  const parsed = requestIdSchema.safeParse(id);

  return (
    <Layout className="page">
      <Layout.Content className="content">
        <Link to="/">Voltar às solicitações</Link>
        {parsed.success ? (
          <RequestDetailContent id={parsed.data} />
        ) : (
          <Alert
            type="error"
            showIcon
            message="Código da solicitação inválido."
            className="detail-card"
          />
        )}
      </Layout.Content>
    </Layout>
  );
}
