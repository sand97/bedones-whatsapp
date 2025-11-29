import { ShopOutlined, SyncOutlined, SearchOutlined } from '@ant-design/icons'
import {
  catalogApi,
  type CatalogData,
  type Product,
  type Collection,
} from '@app/lib/api/catalog'
import {
  Card,
  Typography,
  Empty,
  Button,
  message,
  Checkbox,
  Input,
  Spin,
  Space,
} from 'antd'
import { useState, useEffect, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'

const { Text, Paragraph } = Typography

export function meta() {
  return [
    { title: 'Catalogue - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Gérez votre catalogue de produits',
    },
  ]
}

interface CatalogItem {
  type: 'collection' | 'product'
  data: Collection | Product
}

export default function CatalogPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null)
  const [showCollections, setShowCollections] = useState(true)
  const [showProducts, setShowProducts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Load catalog data
  const loadCatalog = async () => {
    try {
      setIsLoading(true)
      const data = await catalogApi.getCatalog()
      setCatalogData(data)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue'
      message.error({
        content: errorMessage || 'Erreur lors du chargement du catalogue',
        duration: 5,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  const handleForceSync = async () => {
    try {
      setIsSyncing(true)
      message.loading({ content: 'Synchronisation en cours...', key: 'sync' })

      const result = await catalogApi.forceSync()

      if (result.success) {
        message.success({
          content: 'Synchronisation réussie !',
          key: 'sync',
          duration: 3,
        })
        // Reload catalog after sync
        await loadCatalog()
      } else {
        message.error({
          content: result.error || 'Échec de la synchronisation',
          key: 'sync',
          duration: 5,
        })
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue'
      message.error({
        content: errorMessage || 'Erreur lors de la synchronisation',
        key: 'sync',
        duration: 5,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter and search items
  const filteredItems = useMemo(() => {
    if (!catalogData) return []

    const items: CatalogItem[] = []

    // Add collections
    if (showCollections) {
      catalogData.collections.forEach(collection => {
        items.push({ type: 'collection', data: collection })
        // Add products in collection
        if (showProducts) {
          collection.products.forEach(product => {
            items.push({ type: 'product', data: product })
          })
        }
      })
    }

    // Add uncategorized products
    if (showProducts) {
      catalogData.uncategorizedProducts.forEach(product => {
        items.push({ type: 'product', data: product })
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return items.filter(item => {
        if (item.type === 'collection') {
          const collection = item.data as Collection
          return (
            collection.name.toLowerCase().includes(query) ||
            collection.description?.toLowerCase().includes(query)
          )
        } else {
          const product = item.data as Product
          return (
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query)
          )
        }
      })
    }

    return items
  }, [catalogData, showCollections, showProducts, searchQuery])

  const renderCollectionCard = (collection: Collection) => (
    <Card
      className='w-full'
      styles={{
        body: { padding: 16 },
      }}
    >
      <div className='flex gap-4'>
        <div className='w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0'>
          <ShopOutlined className='text-2xl text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <Text strong className='block mb-1'>
            📁 {collection.name}
          </Text>
          {collection.description && (
            <Paragraph
              type='secondary'
              ellipsis={{ rows: 2 }}
              className='mb-2 text-sm'
            >
              {collection.description}
            </Paragraph>
          )}
          <Text type='secondary' className='text-sm'>
            {collection.products.length} produit(s)
          </Text>
        </div>
      </div>
    </Card>
  )

  const renderProductCard = (product: Product) => {
    const firstImage = product.images[0]
    const price = product.price
      ? `${product.price} ${product.currency || 'FCFA'}`
      : 'Prix non défini'

    return (
      <Card
        className='w-full'
        styles={{
          body: { padding: 16 },
        }}
      >
        <div className='flex gap-4'>
          {/* Product Image */}
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={product.name}
              className='w-20 h-20 object-cover rounded-lg flex-shrink-0'
            />
          ) : (
            <div className='w-20 h-20 bg-gradient-to-br from-blue-600 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0'>
              <ShopOutlined className='text-2xl text-white' />
            </div>
          )}

          {/* Product Info */}
          <div className='flex-1 min-w-0'>
            <Text strong className='block mb-1'>
              {product.name}
            </Text>
            {product.description && (
              <Paragraph
                type='secondary'
                ellipsis={{ rows: 2 }}
                className='mb-2 text-sm'
              >
                {product.description}
              </Paragraph>
            )}
            <Text strong className='text-sm'>
              {price}
            </Text>
            {product.category && (
              <Text type='secondary' className='text-xs block'>
                {product.category}
              </Text>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Virtualized list row renderer
  const Row = ({
    index,
    style,
  }: {
    index: number
    style: React.CSSProperties
  }) => {
    const item = filteredItems[index]

    return (
      <div style={style} className='px-6 pb-4'>
        {item.type === 'collection'
          ? renderCollectionCard(item.data as Collection)
          : renderProductCard(item.data as Product)}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center w-full h-full'>
        <Spin size='large' />
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full w-full'>
      {/* Header with filters and search */}
      <div className='flex justify-between items-center px-6 pt-6 pb-4 border-b'>
        <Space size='middle'>
          <Checkbox
            checked={showCollections}
            onChange={e => setShowCollections(e.target.checked)}
          >
            Collections
          </Checkbox>
          <Checkbox
            checked={showProducts}
            onChange={e => setShowProducts(e.target.checked)}
          >
            Produits
          </Checkbox>
          <Button
            type='primary'
            icon={<SyncOutlined spin={isSyncing} />}
            onClick={handleForceSync}
            loading={isSyncing}
          >
            Synchroniser
          </Button>
        </Space>

        <Input
          placeholder='Rechercher...'
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      {/* Virtualized List */}
      <div className='flex-1'>
        {filteredItems.length > 0 ? (
          <List
            height={window.innerHeight - 150}
            itemCount={filteredItems.length}
            itemSize={120}
            width='100%'
          >
            {Row}
          </List>
        ) : (
          <div className='p-6'>
            <Card>
              <Empty
                image={
                  <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto'>
                    <ShopOutlined className='text-2xl text-[#494949]' />
                  </div>
                }
                description={
                  <div className='flex flex-col gap-2'>
                    <Text strong>Aucun résultat</Text>
                    <Text type='secondary'>
                      {searchQuery
                        ? 'Aucun produit ou collection ne correspond à votre recherche'
                        : 'Importez votre catalogue WhatsApp Business pour commencer'}
                    </Text>
                  </div>
                }
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
