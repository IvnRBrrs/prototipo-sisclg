import { useState, useEffect } from 'react'
import { fetchImagesWithDataCached } from '../cms/contentCache'

interface ImageRecord {
  id: string
  filename: string
  data: string
  type: string
  component_type: string | null
  created_at: string
}

interface ImagePickerModalProps {
  onSelect: (url: string, filename?: string) => void
  onClose: () => void
}

export default function ImagePickerModal({ onSelect, onClose }: ImagePickerModalProps) {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImagesWithDataCached().then(({ data }) => {
      setImages(data as ImageRecord[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const getUrl = (img: ImageRecord) => {
    if (img.data.startsWith('data:')) return img.data
    return `data:${img.type};base64,${img.data}`
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Selecionar Imagem</h3>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-modal-body">
          {loading ? (
            <p className="admin-empty">Carregando...</p>
          ) : images.length === 0 ? (
            <p className="admin-empty">Nenhuma imagem na biblioteca. Envie imagens na aba "Imagens".</p>
          ) : (
            <div className="admin-picker-grid">
              {images.map((img) => {
                const url = getUrl(img)
                return (
                  <div key={img.id} className="admin-picker-item" onClick={() => onSelect(url, img.filename)}>
                    <img src={url} alt={img.filename} />
                    <span>{img.filename}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
