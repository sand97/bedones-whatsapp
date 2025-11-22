import {
  QuestionCircleOutlined,
  SendOutlined,
  PaperClipOutlined,
  CustomerServiceOutlined,
  ShopOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { App, Button, Input } from 'antd'
import { useState, useEffect } from 'react'

interface OnboardingQuestion {
  id: string
  question: string
  description: string
  category: string
}

interface OnboardingState {
  score: number
  currentQuestion: OnboardingQuestion | null
  messages: Array<{
    id: string
    type: 'question' | 'answer'
    content: string
  }>
}

export function meta() {
  return [
    { title: "Contexte de l'IA - WhatsApp Agent" },
    {
      name: 'description',
      content: "Configurez le contexte de l'IA pour améliorer les réponses",
    },
  ]
}

// Sample questions for the onboarding
const sampleQuestions: OnboardingQuestion[] = [
  {
    id: '1',
    question: 'Est-ce que vous proposez la livraison ?',
    description:
      "Si oui veuillez nous indiquer dans qu'elles villes ainsi que les frais d'expéditions pour chaque villes",
    category: 'delivery',
  },
  {
    id: '2',
    question: "Quels sont vos horaires d'ouverture ?",
    description:
      'Indiquez vos jours et heures de disponibilité pour répondre aux clients',
    category: 'availability',
  },
  {
    id: '3',
    question: 'Comment gérez-vous les retours ?',
    description: 'Décrivez votre politique de retour et de remboursement',
    category: 'returns',
  },
]

export default function ContextOnboardingPage() {
  const { user } = useAuth()
  const { notification } = App.useApp()
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [state, setState] = useState<OnboardingState>({
    score: 45, // Initial score from user context
    currentQuestion: sampleQuestions[0],
    messages: [],
  })

  // Get score from user if available
  useEffect(() => {
    if (user?.contextScore !== undefined) {
      setState(prev => ({ ...prev, score: user.contextScore as number }))
    }
  }, [user])

  const handleSubmit = async () => {
    if (!inputValue.trim() || !state.currentQuestion) return

    setIsSubmitting(true)

    try {
      // Add the answer to messages
      const newMessages = [
        ...state.messages,
        {
          id: `answer-${state.currentQuestion.id}`,
          type: 'answer' as const,
          content: inputValue,
        },
      ]

      // TODO: Send to API
      // await apiClient.post('/context/answer', {
      //   questionId: state.currentQuestion.id,
      //   answer: inputValue,
      // })

      // Move to next question
      const currentIndex = sampleQuestions.findIndex(
        q => q.id === state.currentQuestion?.id
      )
      const nextQuestion = sampleQuestions[currentIndex + 1] || null

      // Update score (simulated)
      const newScore = Math.min(100, state.score + 15)

      setState({
        score: newScore,
        currentQuestion: nextQuestion,
        messages: newMessages,
      })

      setInputValue('')

      if (!nextQuestion) {
        notification.success({
          message: 'Configuration terminée',
          description: "Le contexte de l'IA a été mis à jour avec succès",
        })
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      notification.error({
        message: 'Erreur',
        description: err.response?.data?.message || 'Une erreur est survenue',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'border-[#24d366] text-[#24d366]'
    if (score >= 50) return 'border-[#ff9500] text-[#111b21]'
    return 'border-[#ff9500] text-[#111b21]'
  }

  return (
    <div className='h-full flex flex-col gap-[10px] justify-end'>
      {/* Header */}
      <div className='pb-6'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <QuestionCircleOutlined className='text-lg' />
            <h1 className='text-xl font-semibold text-[#111b21] tracking-[-0.1px] leading-7 m-0'>
              Conversation d&apos;initialization
            </h1>
          </div>
          <div
            className={`border rounded-full px-4 py-0 h-[46px] flex items-center justify-center ${getScoreColor(state.score)}`}
          >
            <span className='font-semibold text-sm tracking-[0.35px]'>
              Score • {state.score}%
            </span>
          </div>
        </div>
        <p className='text-base text-[#111b21] tracking-[-0.1px] leading-7 m-0'>
          Cette conversation est utilisée pour améliorer les compétences de
          l&apos;IA et ses réponses à vos contacts
        </p>
      </div>

      {/* Current Question */}
      {state.currentQuestion && (
        <div className='py-6 border-t border-gray-100'>
          <div className='flex items-center gap-2 mb-2'>
            <QuestionCircleOutlined className='text-lg' />
            <h2 className='text-base font-medium text-black leading-4 tracking-[0.35px] m-0'>
              {state.currentQuestion.question}
            </h2>
          </div>
          <p className='text-base text-[#111b21] tracking-[-0.1px] leading-7 m-0'>
            {state.currentQuestion.description}
          </p>
        </div>
      )}

      {/* Completed Message */}
      {!state.currentQuestion && (
        <div className='py-6 border-t border-gray-100 text-center'>
          <h2 className='text-xl font-medium text-[#24d366] mb-2'>
            Configuration terminée !
          </h2>
          <p className='text-base text-[#494949]'>
            Vous avez répondu à toutes les questions. Votre IA est maintenant
            prête à répondre à vos clients.
          </p>
        </div>
      )}

      {/* Spacer */}
      <div className='flex-1' />

      {/* Input Area */}
      {state.currentQuestion && (
        <div className='bg-white rounded-[40px] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] p-4'>
          <div className='bg-[#fdfdfd] rounded-3xl shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] px-4 py-[10px] flex items-center gap-4 mb-2'>
            <PaperClipOutlined className='text-lg text-gray-400' />
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={handleSubmit}
              placeholder='Quels sont vos instructions ?'
              variant='borderless'
              className='flex-1 text-sm'
            />
            <Button
              type='primary'
              shape='circle'
              size='large'
              icon={<ArrowUpOutlined />}
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!inputValue.trim()}
              className='bg-black border-none hover:bg-gray-800'
            />
          </div>

          {/* Quick Action Buttons */}
          <div className='flex gap-2'>
            <Button
              type='default'
              className='rounded-full bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] border-none flex items-center gap-2 px-4 py-3 h-auto'
            >
              <CustomerServiceOutlined />
              <span className='font-medium text-sm text-[#050505] tracking-[-0.1px]'>
                Support
              </span>
            </Button>
            <Button
              type='default'
              className='rounded-full bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] border-none flex items-center gap-2 px-4 py-3 h-auto'
            >
              <ShopOutlined />
              <span className='font-medium text-sm text-[#050505] tracking-[-0.1px]'>
                Stratégie de vente
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
