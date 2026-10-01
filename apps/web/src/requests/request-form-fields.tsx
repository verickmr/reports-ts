import type { CategoriesResponse } from '@portal/contracts';
import { Form, Input, Select } from 'antd';

export function RequestFormFields({
  categories,
  categoriesLoading,
  categoriesDisabled,
}: {
  categories?: CategoriesResponse;
  categoriesLoading: boolean;
  categoriesDisabled: boolean;
}) {
  return (
    <>
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
          { whitespace: true, message: 'Informe uma descrição válida.' },
        ]}
      >
        <Input.TextArea rows={5} />
      </Form.Item>
      <Form.Item
        label="Categoria"
        name="categoryId"
        rules={[{ required: true, message: 'Selecione uma categoria.' }]}
      >
        <Select
          placeholder="Selecione uma categoria"
          loading={categoriesLoading}
          disabled={categoriesDisabled}
          options={categories?.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />
      </Form.Item>
    </>
  );
}
