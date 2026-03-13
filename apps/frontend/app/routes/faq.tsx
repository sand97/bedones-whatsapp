import {
  ArrowRightOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import { Button, Card, Collapse, Tag, Typography } from 'antd'
import type { CollapseProps } from 'antd'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const { Paragraph, Text, Title } = Typography

const FAQ_ITEMS = [
  {
    key: 'demarrage',
    category: 'Onboarding',
    question: "Comment lancer l'agent pour la première fois ?",
    answer: [
      'Commencez par connecter votre numéro WhatsApp depuis les écrans de connexion, puis complétez le contexte de l’IA avant d’activer le mode production.',
      'Le score de contexte sert de garde-fou : tant qu’il reste insuffisant, les pages sensibles du dashboard demeurent verrouillées.',
    ],
  },
  {
    key: 'catalogue',
    category: 'Catalogue',
    question: 'À quoi sert la page Catalogue ?',
    answer: [
      'Le catalogue centralise vos produits et permet à l’agent de s’appuyer sur une base métier cohérente pour répondre correctement.',
      'Plus vos fiches sont précises, plus les suggestions générées dans WhatsApp gagnent en pertinence.',
    ],
  },
  {
    key: 'status',
    category: 'Marketing',
    question: 'Que puis-je faire avec le Status scheduler ?',
    answer: [
      'Le planificateur permet de préparer à l’avance des statuts texte, image ou vidéo sur un calendrier mensuel.',
      'Vous pouvez ensuite suivre les contenus planifiés par jour et ajuster rapidement les horaires ou supprimer une publication.',
    ],
  },
  {
    key: 'stats',
    category: 'Pilotage',
    question: 'Comment lire les statistiques du dashboard ?',
    answer: [
      'La page Statistiques compare vos messages et conversations sur une période choisie afin d’identifier les évolutions importantes.',
      'Les deltas et graphiques servent surtout à visualiser la tendance, pas à remplacer une analyse commerciale détaillée.',
    ],
  },
  {
    key: 'leads',
    category: 'Roadmap',
    question: 'À quoi servira la page Leads ?',
    answer: [
      'La page Leads aidera à rassembler les conversations à suivre, les relances importantes et les opportunités en cours.',
      'Les labels utilisateur serviront de base pour mieux trier les demandes et garder une vue claire sur les priorités.',
    ],
  },
  {
    key: 'forfaits',
    category: 'Abonnement',
    question: 'Où comparer les différents forfaits ?',
    answer: [
      'La nouvelle page Forfaits présente les trois offres du produit avec un résumé, les usages ciblés et un point d’entrée pour contacter le support.',
      'Si votre plan courant est connu par le frontend, il est automatiquement mis en avant sur la page.',
    ],
  },
  {
    key: 'support',
    category: 'Support',
    question: 'Comment envoyer un retour produit ou signaler un bug ?',
    answer: [
      'La page Support embarque un formulaire connecté à Sentry User Feedback pour centraliser les retours fonctionnels et techniques.',
      'Le formulaire transmet le message ainsi que quelques métadonnées utiles non sensibles, comme la page courante et le plan détecté.',
    ],
  },
]

export function meta() {
  return [
    { title: 'FAQ - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Questions fréquentes du dashboard WhatsApp Agent avec sections repliables',
    },
  ]
}

export default function FaqPage() {
  const navigate = useNavigate()

  const items = useMemo<CollapseProps['items']>(
    () =>
      FAQ_ITEMS.map(item => ({
        key: item.key,
        label: (
          <div className='flex min-w-0 flex-col gap-1 py-1'>
            <Text strong className='text-[15px] text-[#111b21]'>
              {item.question}
            </Text>
            <Text className='text-xs text-[#6a6a6a]'>{item.category}</Text>
          </div>
        ),
        children: (
          <div className='flex flex-col gap-3 pt-1 text-[#4d4d4d]'>
            {item.answer.map(paragraph => (
              <Paragraph key={paragraph} className='!mb-0'>
                {paragraph}
              </Paragraph>
            ))}
          </div>
        ),
      })),
    []
  )

  return (
    <>
      <DashboardHeader
        title='FAQ'
        right={
          <Tag className='rounded-full border-none bg-[#effaf3] px-3 py-1 text-[#178f57]'>
            Base produit V1
          </Tag>
        }
      />

      <div className='flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6'>
        <Card styles={{ body: { padding: 0 } }} className='overflow-hidden'>
          <div className='grid grid-cols-1 gap-0 lg:grid-cols-[1.4fr_0.8fr]'>
            <div className='bg-[linear-gradient(135deg,#fffdf7_0%,#f7fff9_55%,#eefaf2_100%)] px-6 py-7 sm:px-8 sm:py-8'>
              <Tag className='mb-4 rounded-full border-none bg-[#111b21] px-3 py-1 text-white'>
                Questions fréquentes
              </Tag>
              <Title level={3} className='!mb-2'>
                Une FAQ simple à enrichir sans refaire la structure.
              </Title>
              <Paragraph className='!mb-0 max-w-2xl text-[#5b5b5b]'>
                Chaque entrée vit dans une configuration unique, puis est rendue
                dans un composant Ant Design repliable pour rester lisible sur
                mobile comme sur desktop.
              </Paragraph>
            </div>

            <div className='flex flex-col justify-between gap-4 bg-[#111b21] px-6 py-7 text-white sm:px-8 sm:py-8'>
              <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10'>
                <QuestionCircleOutlined className='text-lg text-white' />
              </div>
              <div>
                <Text className='!mb-2 block !text-white/72'>
                  Vous ne trouvez pas votre réponse ?
                </Text>
                <Title level={4} className='!mb-2 !text-white'>
                  Ouvrez un retour support sans quitter le dashboard.
                </Title>
                <Paragraph className='!mb-0 !text-white/72'>
                  Le formulaire support permet de transmettre un bug, une
                  demande d’aide ou un besoin d’évolution produit.
                </Paragraph>
              </div>
              <Button
                type='primary'
                shape='round'
                icon={<ArrowRightOutlined />}
                iconPosition='end'
                onClick={() => navigate('/support')}
              >
                Aller au support
              </Button>
            </div>
          </div>
        </Card>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_0.8fr]'>
          <Card className='h-full' styles={{ body: { padding: 24 } }}>
            <Collapse
              ghost
              size='large'
              items={items}
              className='faq-collapse'
            />
          </Card>

          <Card className='h-full' styles={{ body: { padding: 24 } }}>
            <div className='flex h-full flex-col gap-5'>
              <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#178f57]'>
                <MessageOutlined className='text-lg' />
              </div>
              <div>
                <Title level={5} className='!mb-2'>
                  Conseils rapides
                </Title>
                <Paragraph className='!mb-3 text-[#5b5b5b]'>
                  Commencez par les pages <Text strong>Contexte</Text>,
                  <Text strong> Catalogue</Text> et
                  <Text strong> Status scheduler</Text> pour stabiliser votre
                  usage avant de chercher à automatiser plus loin.
                </Paragraph>
                <Paragraph className='!mb-0 text-[#5b5b5b]'>
                  La structure de cette FAQ est volontairement en tableau de
                  données pour faciliter les prochains ajouts sans modifier la
                  mise en page.
                </Paragraph>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
