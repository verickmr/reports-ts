import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Layout,
  Typography,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { LoginInput } from '@portal/contracts';
import {
  fetchGoogleAvailability,
  googleAvailabilityQueryKey,
  login,
  sessionQueryKey,
} from '../auth/auth.api';
import { useSession } from '../auth/use-session';

export function LoginPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleResult = searchParams.get('google');
  const googleAvailability = useQuery({
    queryKey: googleAvailabilityQueryKey,
    queryFn: fetchGoogleAvailability,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const signIn = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, data);
      navigate('/', { replace: true });
    },
  });

  if (session.isSuccess && session.data) return <Navigate to="/" replace />;

  return (
    <Layout className="page centered">
      <Card className="login-card" title="Entrar no Portal de Solicitações">
        <Typography.Paragraph>
          Acesse com seu usuário e senha para acompanhar solicitações internas.
        </Typography.Paragraph>
        {googleResult === 'cancelled' && (
          <Alert
            type="info"
            showIcon
            message="Login com Google cancelado."
            className="form-alert"
          />
        )}
        {googleResult === 'failed' && (
          <Alert
            type="error"
            showIcon
            message="Não foi possível entrar com Google. Tente novamente."
            className="form-alert"
          />
        )}
        <Form<LoginInput>
          layout="vertical"
          onFinish={(values) => signIn.mutate(values)}
          autoComplete="off"
        >
          <Form.Item
            label="Usuário"
            name="username"
            rules={[{ required: true, message: 'Informe o usuário.' }]}
          >
            <Input autoComplete="username" maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Senha"
            name="password"
            rules={[{ required: true, message: 'Informe a senha.' }]}
          >
            <Input.Password autoComplete="current-password" maxLength={128} />
          </Form.Item>
          {signIn.isError && (
            <Alert
              type="error"
              showIcon
              message={signIn.error.message}
              className="form-alert"
            />
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={signIn.isPending}
            block
          >
            Entrar
          </Button>
        </Form>
        {googleAvailability.data?.enabled && (
          <>
            <Divider plain>ou</Divider>
            <Button href="/api/auth/google/start" block>
              Entrar com Google
            </Button>
          </>
        )}
      </Card>
    </Layout>
  );
}
