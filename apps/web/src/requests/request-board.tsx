import {
  requestStatusSchema,
  type ListedRequests,
  type ListRequestsQuery,
} from '@portal/contracts';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { listAllRequests, updateRequestStatus } from './requests.api';

type RequestStatus = ListedRequests[number]['status'];

const columns: { status: RequestStatus; label: string }[] = [
  { status: 'OPEN', label: 'Abertas' },
  { status: 'IN_PROGRESS', label: 'Em andamento' },
  { status: 'COMPLETED', label: 'Concluídas' },
];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function RequestBoard({ filters }: { filters: ListRequestsQuery }) {
  const queryClient = useQueryClient();
  const boardQueryKey = ['requests', 'board', filters] as const;
  const board = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => listAllRequests(filters),
    retry: false,
  });
  const move = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RequestStatus }) =>
      updateRequestStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey });
      const previous = queryClient.getQueryData<ListedRequests>(boardQueryKey);
      queryClient.setQueryData<ListedRequests>(boardQueryKey, (requests) =>
        requests?.map((request) =>
          request.id === id ? { ...request, status } : request,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardQueryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  function onDragEnd({ destination, source, draggableId }: DropResult) {
    if (!destination || destination.droppableId === source.droppableId) return;
    const status = requestStatusSchema.safeParse(destination.droppableId);
    const id = Number(draggableId);
    if (!status.success || !Number.isSafeInteger(id)) return;
    const request = board.data?.find((item) => item.id === id);
    if (!request || request.status === status.data) return;
    move.mutate({ id, status: status.data });
  }

  if (board.isPending) {
    return (
      <div className="board-loading">
        <Spin size="large" />
      </div>
    );
  }
  if (board.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={board.error.message}
        action={
          <Button onClick={() => void board.refetch()}>Tentar novamente</Button>
        }
      />
    );
  }

  return (
    <div>
      <p className="board-hint">
        Arraste um cartão para outra coluna para atualizar o status. A ordem
        segue a data de abertura.
      </p>
      {move.isError && (
        <Alert
          type="error"
          showIcon
          message={move.error.message}
          className="form-alert"
          closable
          onClose={() => move.reset()}
        />
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-grid">
          {columns.map(({ status, label }) => {
            const requests = board.data.filter(
              (request) => request.status === status,
            );
            return (
              <Droppable
                key={status}
                droppableId={status}
                isDropDisabled={move.isPending}
              >
                {(provided, snapshot) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`board-column ${snapshot.isDraggingOver ? 'board-column-target' : ''}`}
                    aria-label={label}
                  >
                    <div className="board-column-heading">
                      <h3>{label}</h3>
                      <span>{requests.length}</span>
                    </div>
                    <div className="board-column-cards">
                      {requests.length === 0 && (
                        <p className="board-empty">
                          Nenhuma solicitação nesta etapa.
                        </p>
                      )}
                      {requests.map((request, index) => (
                        <Draggable
                          key={request.id}
                          draggableId={String(request.id)}
                          index={index}
                          isDragDisabled={move.isPending}
                        >
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className="board-card"
                            >
                              <div className="board-card-heading">
                                <span className="board-card-code">
                                  #{request.id}
                                </span>
                                <button
                                  type="button"
                                  {...drag.dragHandleProps}
                                  aria-label={`Mover solicitação #${request.id}`}
                                  className="board-drag-handle"
                                >
                                  ⋮⋮
                                </button>
                              </div>
                              <Link
                                to={`/requests/${request.id}`}
                                className="board-card-title"
                              >
                                {request.title}
                              </Link>
                              <span className="board-card-category">
                                {request.category.name}
                              </span>
                              <div className="board-card-footer">
                                <span>{request.requester.name}</span>
                                <time dateTime={request.createdAt}>
                                  {dateFormatter.format(
                                    new Date(request.createdAt),
                                  )}
                                </time>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </section>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
