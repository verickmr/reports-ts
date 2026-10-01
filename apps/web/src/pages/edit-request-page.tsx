import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestIdSchema, type UpdateRequestInput } from '@portal/contracts';
import { Alert, Button, Card, Form, Layout } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { RequestFormFields } from '../requests/request-form-fields';
import { getRequestDetail, updateRequest } from '../requests/requests.api';

function EditRequestContent({ id }: { id: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequestDetail(id),
    retry: false,
  });
  const categories = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
  });
  const update = useMutation({
    mutationFn: (input: UpdateRequestInput) => updateRequest(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['request', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate(`/requests/${id}`);
    },
  });

  return (
    <Card
      title={`Editar solicitação #${id}`}
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
      {detail.isSuccess && detail.data.status !== 'OPEN' && (
        <Alert
          type="warning"
          showIcon
          message="Apenas solicitações abertas podem ser editadas."
        />
      )}
      {detail.isSuccess && detail.data.status === 'OPEN' && (
        <>
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
          {update.isError && (
            <Alert
              type="error"
              showIcon
              message={update.error.message}
              className="form-alert"
            />
          )}
          <Form<UpdateRequestInput>
            layout="vertical"
            initialValues={{
              title: detail.data.title,
              description: detail.data.description,
              categoryId: detail.data.category.id,
            }}
            onFinish={(values) => update.mutate(values)}
          >
            <RequestFormFields
              categories={categories.data}
              categoriesLoading={categories.isPending}
              categoriesDisabled={!categories.isSuccess}
            />
            <Button
              type="primary"
              htmlType="submit"
              loading={update.isPending}
              disabled={!categories.isSuccess}
            >
              Salvar alterações
            </Button>
          </Form>
        </>
      )}
    </Card>
  );
}

export function EditRequestPage() {
  const { id } = useParams();
  const parsed = requestIdSchema.safeParse(id);

  return (
    <Layout className="page">
      <Layout.Content className="content">
        <Link to={parsed.success ? `/requests/${parsed.data}` : '/'}>
          {parsed.success ? 'Voltar aos detalhes' : 'Voltar às solicitações'}
        </Link>
        {parsed.success ? (
          <EditRequestContent id={parsed.data} />
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
