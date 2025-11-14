import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { $api } from '@app/core/openapi-rq.config'
import { App, Button, Card, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const { message } = App.useApp()

  // This route and his param are end to end typed with backend
  const loginMutation = $api.useMutation('post', '/auth/login', {
    onSuccess: () => {
      message.success('Login successful!')
      navigate('/')
    },
    onError: (error: any) => {
      message.error('Login failed. Please check your credentials.')
      console.error('Login error:', error)
    },
  })

  const handleSubmit = async (values: { email: string; password: string }) => {
    loginMutation.mutate({
      body: {
        email: values.email,
        password: values.password,
      },
    })
  }

  return (
    <Card className='shadow-lg'>
      <div className='text-center mb-6'>
        <Title level={2}>Welcome Back</Title>
        <Text type='secondary'>Sign in to your account</Text>
      </div>

      <Form
        form={form}
        name='login'
        onFinish={handleSubmit}
        layout='vertical'
        size='large'
      >
        <Form.Item
          name='email'
          label='Email'
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder='Enter your email'
            autoComplete='email'
          />
        </Form.Item>

        <Form.Item
          name='password'
          label='Password'
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder='Enter your password'
            autoComplete='current-password'
          />
        </Form.Item>

        <Form.Item className='mb-0'>
          <Button
            type='primary'
            htmlType='submit'
            loading={loginMutation.isPending}
            className='w-full'
            size='large'
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <div className='text-center mt-4'>
        <Text type='secondary'>
          Don't have an account?{' '}
          <Button type='link' className='p-0'>
            Sign up
          </Button>
        </Text>
      </div>
    </Card>
  )
}
