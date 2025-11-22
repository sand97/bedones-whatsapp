import {
  QuestionCircleOutlined,
  ExpandOutlined,
  HistoryOutlined,
  SendOutlined,
  PaperClipOutlined,
  CustomerServiceOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { Button, Card, Typography, Input, Tag } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'

const { Title, Text, Paragraph } = Typography

export function meta() {
  return [
    { title: 'Contexte - WhatsApp Agent' },
    {
      name: 'description',
      content: "Vue d'ensemble du contexte de l'IA",
    },
  ]
}

// Sample context data
const contextSections = [
  {
    key: 'entreprise',
    label: 'Entreprise',
    children: 'Nom: Mboa Fashion, Contact: +237 657...',
  },
  {
    key: 'pickup',
    label: 'Pickup',
    children: 'Adresse pour les pickup gratuit: Douala, rue besese...',
  },
  {
    key: 'livraison',
    label: 'Livraison',
    children: 'Adresse pour les pickup gratuit: Douala, rue besese...',
  },
]

export default function ContextHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')

  const contextScore = user?.contextScore ?? 45

  const getScoreColor = () => {
    if (contextScore >= 80) return 'success'
    if (contextScore >= 50) return 'warning'
    return 'warning'
  }

  const handleSubmit = () => {
    if (!inputValue.trim()) return
    // Handle context update
    setInputValue('')
  }

  return (
    <div className='h-full flex flex-col p-6'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <QuestionCircleOutlined className='text-lg' />
            <Title level={4} className='m-0'>
              Contexte
            </Title>
          </div>
          <Tag
            color={getScoreColor()}
            className='rounded-full px-4 py-1 text-sm font-semibold'
          >
            Score • {contextScore}%
          </Tag>
        </div>
        <Paragraph type='secondary' className='m-0'>
          Ci-dessous vous trouverez toutes les informations sur lesquelles se
          bases l&apos;IA pour répondre aux messages de vos clients
        </Paragraph>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 mb-4'>
        <Button
          type='default'
          shape='round'
          icon={<ExpandOutlined />}
          iconPosition='end'
        >
          Déplier tout les contenus
        </Button>
        <Button
          type='default'
          shape='round'
          icon={<HistoryOutlined />}
          iconPosition='end'
          onClick={() => navigate('/context/onboarding')}
        >
          Historique
        </Button>
      </div>

      {/* Context Sections */}
      <div className='flex flex-col gap-2 w-full mb-6'>
        {contextSections.map(section => (
          <Card
            key={section.key}
            size='small'
            styles={{
              body: { padding: 16 },
            }}
          >
            <Text strong className='block mb-1'>
              {section.label}
            </Text>
            <Text type='secondary'>{section.children}</Text>
          </Card>
        ))}
      </div>

      {/* Spacer */}
      <div className='flex-1' />

      {/* Input Area */}
      <Card
        className='rounded-[40px]'
        styles={{
          body: { padding: 16 },
        }}
      >
        <Card
          className='rounded-3xl mb-2'
          styles={{
            body: {
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            },
          }}
        >
          <PaperClipOutlined className='text-lg text-gray-400' />
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={handleSubmit}
            placeholder='Quels sont vos instructions ?'
            variant='borderless'
            className='flex-1'
          />
          <Button
            type='primary'
            shape='circle'
            size='large'
            icon={<SendOutlined className='rotate-[-45deg]' />}
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            style={{ backgroundColor: '#000', borderColor: '#000' }}
          />
        </Card>

        {/* Quick Action Buttons */}
        <div className='flex gap-2'>
          <Button
            type='default'
            shape='round'
            icon={<CustomerServiceOutlined />}
          >
            Support
          </Button>
          <Button type='default' shape='round' icon={<ShopOutlined />}>
            Stratégie de vente
          </Button>
        </div>
      </Card>
    </div>
  )
}
