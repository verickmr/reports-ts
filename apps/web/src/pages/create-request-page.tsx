import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRequestInput } from '@portal/contracts';
import { Alert, Button, Card, Form, Layout, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { createRequest } from '../requests/requests.api';
import { RequestFormFields } from '../requests/request-form-fields';

export function CreateRequestPage() {
  const [form] = Form.useForm<CreateRequestInput>();
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
  });
  const creation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  return (
    <Layout className="page">
      <Layout.Content className="content">
        <Space
          direction="vertical"
          size="large"
          className="request-form-container"
        >
          <div>
            <Link to="/">Voltar ao início</Link>
            <Typography.Title level={2}>Nova solicitação</Typography.Title>
          </div>
          <Card>
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
            {creation.isSuccess && (
              <Alert
                type="success"
                showIcon
                message={`Solicitação #${creation.data.id} criada com sucesso.`}
                className="form-alert"
              />
            )}
            {creation.isError && (
              <Alert
                type="error"
                showIcon
                message={creation.error.message}
                className="form-alert"
              />
            )}
            <Form<CreateRequestInput>
              form={form}
              layout="vertical"
              onFinish={(values) => creation.mutate(values)}
            >
              <RequestFormFields
                categories={categories.data}
                categoriesLoading={categories.isPending}
                categoriesDisabled={!categories.isSuccess}
              />
              <Button
                type="primary"
                htmlType="submit"
                loading={creation.isPending}
                disabled={!categories.isSuccess}
              >
                Criar solicitação
              </Button>
            </Form>
          </Card>
        </Space>
      </Layout.Content>
    </Layout>
  );
}
