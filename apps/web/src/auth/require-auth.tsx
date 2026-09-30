import { Alert, Button, Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { useSession } from './use-session';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (session.isPending) {
    return (
      <div className="centered">
        <Spin size="large" />
      </div>
    );
  }
  if (session.isError) {
    return (
      <div className="centered">
        <Alert
          type="error"
          showIcon
          message={session.error.message}
          action={
            <Button onClick={() => void session.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }
  if (!session.data) return <Navigate to="/login" replace />;
  return children;
}
