import {
  ShopOutlined,
  SyncOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import {
  catalogApi,
  type CatalogData,
  type Product,
} from '@app/lib/api/catalog'
import { Typography, Empty, Button, message, Spin } from 'antd'
import useEmblaCarousel from 'embla-carousel-react'
import { useState, useEffect, useMemo, useCallback } from 'react'

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

function ImageCarousel({ images }: { images: Array<{ url: string }> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [hovering, setHovering] = useState(false)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  if (!images || images.length === 0) {
    return (
      <div className='w-full h-48 bg-gradient-to-br from-blue-600 to-pink-500 rounded-t-lg flex items-center justify-center'>
        <ShopOutlined className='text-5xl text-white' />
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0].url}
        alt='Product'
        className='w-full h-48 object-cover rounded-t-lg'
      />
    )
  }

  return (
    <div
      className='relative'
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className='overflow-hidden rounded-t-lg' ref={emblaRef}>
        <div className='flex'>
          {images.map((image, index) => (
            <div key={index} className='flex-[0_0_100%] min-w-0'>
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className='w-full h-48 object-cover'
              />
            </div>
          ))}
        </div>
      </div>

      {hovering && images.length > 1 && (
        <>
          <Button
            onClick={scrollPrev}
            className='!absolute left-2 top-1/2 !-translate-y-1/2 shadow-lg'
            variant='outlined'
            icon={<LeftOutlined />}
            shape='circle'
          />
          <Button
            onClick={scrollNext}
            className='!absolute right-2 top-1/2 !-translate-y-1/2 shadow-lg'
            variant='outlined'
            icon={<RightOutlined />}
            shape='circle'
          />
        </>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const price = product.price
    ? `${product.price} ${product.currency || 'FCFA'}`
    : null

  return (
    <div className='bg-white rounded-lg  overflow-hidden shadow-card flex flex-col h-full'>
      <ImageCarousel images={product.images} />

      <div className='p-4 flex flex-col flex-1'>
        <Text strong className='block mb-2 text-base'>
          {product.name}
        </Text>

        {product.description && (
          <Paragraph
            type='secondary'
            ellipsis={{ rows: 2 }}
            className='mb-3 text-sm flex-1'
          >
            {product.description}
          </Paragraph>
        )}

        {(price || product.category) && (
          <div className='flex items-center justify-between mt-auto'>
            {price && (
              <Text strong className='text-base'>
                {price}
              </Text>
            )}
            {product.category && (
              <Text type='secondary' className='text-xs'>
                {product.category}
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null)

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

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!catalogData) return { collections: 0, products: 0 }

    const collectionsCount = catalogData.collections.length
    const productsInCollections = catalogData.collections.reduce(
      (sum, col) => sum + col.products.length,
      0
    )
    const productsCount =
      productsInCollections + catalogData.uncategorizedProducts.length

    return { collections: collectionsCount, products: productsCount }
  }, [catalogData])

  const hasContent = useMemo(() => {
    if (!catalogData) return false
    return (
      catalogData.collections.length > 0 ||
      catalogData.uncategorizedProducts.length > 0
    )
  }, [catalogData])

  if (isLoading) {
    return (
      <div className='flex items-center justify-center w-full h-full'>
        <Spin size='large' />
      </div>
    )
  }

  return (
    <>
      <DashboardHeader
        title={'Catalogue'}
        right={
          <Button
            className={'!h-9 !py-0'}
            variant={'outlined'}
            onClick={handleForceSync}
            loading={isSyncing}
            icon={<SyncOutlined spin={isSyncing} />}
          >
            Synchroniser
          </Button>
        }
      />
      <div className='flex flex-col gap-6 w-full py-6 px-6'>
        {hasContent ? (
          <>
            {/* Statistics Header */}
            <div className='flex items-center gap-2'>
              <Text className='text-base font-semibold'>
                {statistics.collections} collection
                {statistics.collections > 1 ? 's' : ''}, {statistics.products}{' '}
                produit
                {statistics.products > 1 ? 's' : ''}
              </Text>
            </div>

            {/* Collections and their products */}
            {catalogData?.collections.map((collection, index) => (
              <div key={index} className='flex flex-col gap-4'>
                {/* Collection Header */}
                <div>
                  <Text className='text-lg block'>{collection.name}</Text>
                  <Text type='secondary' className='text-sm'>
                    {collection.products.length} produit
                    {collection.products.length > 1 ? 's' : ''}
                  </Text>
                </div>

                {/* Products Grid */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {collection.products.map((product, productIndex) => (
                    <ProductCard key={productIndex} product={product} />
                  ))}
                </div>
              </div>
            ))}

            {/* Uncategorized Products */}
            {catalogData && catalogData.uncategorizedProducts.length > 0 && (
              <div className='flex flex-col gap-4'>
                {/* Uncategorized Header */}
                <div>
                  <Text className='text-lg block'>
                    Produits non catégorisés
                  </Text>
                  <Text type='secondary' className='text-sm'>
                    {catalogData.uncategorizedProducts.length} produit
                    {catalogData.uncategorizedProducts.length > 1 ? 's' : ''}
                  </Text>
                </div>

                {/* Products Grid */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {catalogData.uncategorizedProducts.map(
                    (product, productIndex) => (
                      <ProductCard key={productIndex} product={product} />
                    )
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className='p-6'>
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
                    Importez votre catalogue WhatsApp Business pour commencer
                  </Text>
                </div>
              }
            />
          </div>
        )}
      </div>
    </>
  )
}
