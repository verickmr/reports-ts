import { useMutation, useQuery } from '@tanstack/react-query';
import type { CreateRequestInput } from '@portal/contracts';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  Select,
  Space,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { createRequest } from '../requests/requests.api';

export function CreateRequestPage() {
  const [form] = Form.useForm<CreateRequestInput>();
  const categories = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
  });
  const creation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => form.resetFields(),
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
              <Form.Item
                label="Título"
                name="title"
                rules={[
                  { required: true, message: 'Informe o título.' },
                  { whitespace: true, message: 'Informe um título válido.' },
                ]}
              >
                <Input maxLength={150} />
              </Form.Item>
              <Form.Item
                label="Descrição"
                name="description"
                rules={[
                  { required: true, message: 'Informe a descrição.' },
                  {
                    whitespace: true,
                    message: 'Informe uma descrição válida.',
                  },
                ]}
              >
                <Input.TextArea rows={5} />
              </Form.Item>
              <Form.Item
                label="Categoria"
                name="categoryId"
                rules={[
                  { required: true, message: 'Selecione uma categoria.' },
                ]}
              >
                <Select
                  placeholder="Selecione uma categoria"
                  loading={categories.isPending}
                  disabled={!categories.isSuccess}
                  options={categories.data?.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />
              </Form.Item>
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
