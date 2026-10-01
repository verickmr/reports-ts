import type { RequestDetail } from '@portal/contracts';

type RequestStatus = RequestDetail['status'];

export const statusLabels: Record<RequestStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};

export const statusColors: Record<RequestStatus, string> = {
  OPEN: 'blue',
  IN_PROGRESS: 'gold',
  COMPLETED: 'green',
};
