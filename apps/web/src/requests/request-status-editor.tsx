import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RequestDetail } from '@portal/contracts';
import { Alert, Button, Flex, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { statusLabels } from './request-status';
import { updateRequestStatus } from './requests.api';

type RequestStatus = RequestDetail['status'];

const statusOptions: { value: RequestStatus; label: string }[] = [
  { value: 'OPEN', label: statusLabels.OPEN },
  { value: 'IN_PROGRESS', label: statusLabels.IN_PROGRESS },
  { value: 'COMPLETED', label: statusLabels.COMPLETED },
];

export function RequestStatusEditor({
  request,
}: {
  request: Pick<RequestDetail, 'id' | 'status'>;
}) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(request.status);
  const changeStatus = useMutation({
    mutationFn: (status: RequestStatus) =>
      updateRequestStatus(request.id, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['request', updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  useEffect(() => setSelectedStatus(request.status), [request.status]);

  return (
    <div>
      <Typography.Title level={4}>Alterar status</Typography.Title>
      {changeStatus.isSuccess && (
        <Alert
          type="success"
          showIcon
          message="Status atualizado."
          className="form-alert"
        />
      )}
      {changeStatus.isError && (
        <Alert
          type="error"
          showIcon
          message={changeStatus.error.message}
          className="form-alert"
        />
      )}
      <Flex gap="middle" align="center" wrap="wrap">
        <Select<RequestStatus>
          aria-label="Novo status"
          value={selectedStatus}
          options={statusOptions}
          onChange={(status) => {
            setSelectedStatus(status);
            changeStatus.reset();
          }}
          disabled={changeStatus.isPending}
          style={{ minWidth: 220 }}
        />
        <Button
          type="primary"
          onClick={() => changeStatus.mutate(selectedStatus)}
          loading={changeStatus.isPending}
          disabled={selectedStatus === request.status}
        >
          Salvar status
        </Button>
      </Flex>
    </div>
  );
}
