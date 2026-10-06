import type { CreateRequestInput } from '@portal/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Space } from 'antd';
import {
  categoriesQueryKey,
  listCategories,
} from '../categories/categories.api';
import { createRequest } from './requests.api';
import { RequestFormFields } from './request-form-fields';

export function CreateRequestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [form] = Form.useForm<CreateRequestInput>();
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
  });
  const creation = useMutation({
    mutationFn: createRequest,
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      onCreated(request.id);
    },
  });

  return (
    <Modal
      title="Nova solicitação"
      open
      onCancel={onClose}
      closable={!creation.isPending}
      maskClosable={!creation.isPending}
      keyboard={!creation.isPending}
      footer={null}
    >
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
        <Space>
          <Button onClick={onClose} disabled={creation.isPending}>
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={creation.isPending}
            disabled={!categories.isSuccess}
          >
            Criar solicitação
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
