import { useQuery } from '@tanstack/react-query';
import {
  categoriesResponseSchema,
  type CreateRequestInput,
} from '@portal/contracts';
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

async function fetchCategories() {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Não foi possível carregar as categorias.');
  return categoriesResponseSchema.parse(await response.json());
}

export function CreateRequestPage() {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
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
            <Form<CreateRequestInput> layout="vertical">
              <Form.Item
                label="Título"
                name="title"
                rules={[{ required: true, message: 'Informe o título.' }]}
              >
                <Input maxLength={150} />
              </Form.Item>
              <Form.Item
                label="Descrição"
                name="description"
                rules={[{ required: true, message: 'Informe a descrição.' }]}
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
              <Button type="primary" disabled>
                Criar solicitação
              </Button>
            </Form>
          </Card>
        </Space>
      </Layout.Content>
    </Layout>
  );
}
