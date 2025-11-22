import { ShopOutlined } from '@ant-design/icons'
import { Card, Typography, Empty } from 'antd'

const { Title, Text, Paragraph } = Typography

export function meta() {
  return [
    { title: 'Catalogue - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Gérez votre catalogue de produits',
    },
  ]
}

// Sample product data
const products = [
  {
    id: '1',
    name: 'Maillot barcelone',
    description: 'Connecter votre compte/page Facebook pour répondre...',
    price: '2 500 FCFA',
    image: '/placeholder-product.jpg',
  },
  {
    id: '2',
    name: 'Maillot barcelone',
    description: 'Connecter votre compte/page Facebook pour répondre...',
    price: '2 500 FCFA',
    image: '/placeholder-product.jpg',
  },
]

export default function CatalogPage() {
  return (
    <div className='flex flex-col gap-6 w-full p-6'>
      {/* Header */}
      <div>
        <Title level={4} className='mb-2'>
          Championnat Espagnol
        </Title>
        <Text type='secondary'>
          Connecter votre compte google pour sauvegarder automatiquement vos
          contacts
        </Text>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className='grid grid-cols-2 gap-4'>
          {products.map(product => (
            <Card
              key={product.id}
              className='h-full'
              styles={{
                body: { padding: 16 },
              }}
            >
              <div className='flex gap-4'>
                {/* Product Image */}
                <div className='w-20 h-20 bg-gradient-to-br from-blue-600 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0'>
                  <div className='text-white text-center'>
                    <div className='text-xs font-bold'>LOUIS KING</div>
                    <div className='text-2xl font-bold'>19</div>
                  </div>
                </div>

                {/* Product Info */}
                <div className='flex-1 min-w-0'>
                  <Text strong className='block mb-1'>
                    {product.name}
                  </Text>
                  <Paragraph
                    type='secondary'
                    ellipsis={{ rows: 2 }}
                    className='mb-2 text-sm'
                  >
                    {product.description}
                  </Paragraph>
                  <Text strong className='text-sm'>
                    {product.price}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <Empty
            image={
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto'>
                <ShopOutlined className='text-2xl text-[#494949]' />
              </div>
            }
            description={
              <div className='flex flex-col gap-2'>
                <Text strong>Aucun produit</Text>
                <Text type='secondary'>
                  Importez votre catalogue WhatsApp Business pour commencer
                </Text>
              </div>
            }
          />
        </Card>
      )}
    </div>
  )
}
