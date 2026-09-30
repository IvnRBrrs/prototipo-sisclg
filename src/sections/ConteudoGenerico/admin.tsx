import { useRef, useState } from 'react'
import { AdminProps } from '../../cms/types'

function insertTag(
  textarea: HTMLTextAreaElement,
  openTag: string,
  closeTag: string,
  onUpdate: (key: string, value: string) => void
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = textarea.value
  const selected = text.substring(start, end)
  const replacement = openTag + selected + closeTag
  const newValue = text.substring(0, start) + replacement + text.substring(end)
  onUpdate('cg_html', newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursorPos = start + openTag.length
    textarea.setSelectionRange(cursorPos, cursorPos + selected.length)
  })
}

export default function ConteudoGenericoAdmin({
  content, onUpdate, onUpdateListItem, onAddListItem, onRemoveListItem,
  editingItemId, setEditingItemId, openImageLibrary,
}: AdminProps) {
  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const colorPickerRef = useRef<HTMLInputElement>(null)

  let images: Record<string, string>[] = []
  try { const raw = content._cg_images; if (raw) images = JSON.parse(raw) } catch {}

  const handleToolbar = (openTag: string, closeTag: string) => {
    const ta = htmlRef.current
    if (!ta) return
    insertTag(ta, openTag, closeTag, onUpdate)
  }

  const handleColorClick = () => {
    colorPickerRef.current?.click()
  }

  const handleColorPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    const ta = htmlRef.current
    if (!ta) return
    insertTag(ta, `<span style="color:${color}">`, '</span>', onUpdate)
  }

  return (
    <div className="admin-fields">
      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_title !== ''} onChange={(e) => onUpdate('cg_show_title', e.target.checked ? '1' : '')} />
          Mostrar Título
        </label>
      </div>
      {content.cg_show_title !== '' && (
        <>
          <div className="admin-field">
            <label>Título</label>
            <input value={content.cg_title || ''} onChange={(e) => onUpdate('cg_title', e.target.value)} />
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Alinhamento</label>
              <select value={content.cg_title_align || 'left'} onChange={(e) => onUpdate('cg_title_align', e.target.value)}>
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Cor do Título</label>
              <input type="color" value={content.cg_title_color || '#333333'} onChange={(e) => onUpdate('cg_title_color', e.target.value)} />
            </div>
          </div>
        </>
      )}

      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_subtitle !== ''} onChange={(e) => onUpdate('cg_show_subtitle', e.target.checked ? '1' : '')} />
          Mostrar Subtítulo
        </label>
      </div>
      {content.cg_show_subtitle !== '' && (
        <>
          <div className="admin-field">
            <label>Subtítulo</label>
            <input value={content.cg_subtitle || ''} onChange={(e) => onUpdate('cg_subtitle', e.target.value)} />
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Alinhamento</label>
              <select value={content.cg_subtitle_align || 'left'} onChange={(e) => onUpdate('cg_subtitle_align', e.target.value)}>
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Cor do Subtítulo</label>
              <input type="color" value={content.cg_subtitle_color || '#333333'} onChange={(e) => onUpdate('cg_subtitle_color', e.target.value)} />
            </div>
          </div>
        </>
      )}

      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_button !== ''} onChange={(e) => onUpdate('cg_show_button', e.target.checked ? '1' : '')} />
          Mostrar Botão
        </label>
      </div>
      {content.cg_show_button !== '' && (
        <>
          <div className="admin-field">
            <label>Texto do Botão</label>
            <input value={content.cg_button_text || ''} onChange={(e) => onUpdate('cg_button_text', e.target.value)} />
          </div>
          <div className="admin-field">
            <label>Link do Botão</label>
            <input value={content.cg_button_link || ''} onChange={(e) => onUpdate('cg_button_link', e.target.value)} />
          </div>
        </>
      )}

      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_carousel !== ''} onChange={(e) => onUpdate('cg_show_carousel', e.target.checked ? '1' : '')} />
          Mostrar Carrossel de Imagens
        </label>
      </div>
      {content.cg_show_carousel !== '' && (
        <div className="admin-list-section">
          <h4>Imagens do Carrossel</h4>
          {images.map((img, i) => (
            <div key={img._id || i} className="admin-list-item">
              {editingItemId === img._id ? (
                <div className="admin-list-fields">
                  <div className="admin-field">
                    <label>Imagem</label>
                    <div className="admin-image-row">
                      {img.src && <img src={img.src} alt="" className="admin-thumb" />}
                      <button className="btn btn-sm" onClick={() => openImageLibrary('_cg_images_' + img._id + '_src', 'ConteudoGenerico')}>
                        {img.src ? 'Trocar' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                  <div className="admin-field">
                    <label>Texto Alternativo</label>
                    <input value={img.alt || ''} onChange={(e) => onUpdateListItem('_cg_images', img._id, 'alt', e.target.value)} />
                  </div>
                  <button className="btn btn-sm" onClick={() => setEditingItemId(null)}>Concluído</button>
                </div>
              ) : (
                <div className="admin-list-summary">
                  {img.src ? <img src={img.src} alt="" className="admin-thumb-sm" /> : <span className="admin-no-image">Sem imagem</span>}
                  <span>{img.alt || 'Sem texto alternativo'}</span>
                  <div className="admin-list-actions">
                    <button className="btn btn-sm" onClick={() => setEditingItemId(img._id)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onRemoveListItem('_cg_images', img._id)}>Remover</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button className="btn btn-sm admin-add-btn" onClick={() => onAddListItem('_cg_images')}>+ Adicionar Imagem</button>
        </div>
      )}

      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_video !== ''} onChange={(e) => onUpdate('cg_show_video', e.target.checked ? '1' : '')} />
          Mostrar Vídeo
        </label>
      </div>
      {content.cg_show_video !== '' && (
        <div className="admin-field">
          <label>URL do Vídeo (YouTube / Vimeo)</label>
          <input value={content.cg_video_url || ''} onChange={(e) => onUpdate('cg_video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
      )}

      <div className="admin-field">
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={content.cg_show_text !== ''} onChange={(e) => onUpdate('cg_show_text', e.target.checked ? '1' : '')} />
          Mostrar Texto HTML
        </label>
      </div>
      {content.cg_show_text !== '' && (
        <>
          <div className="admin-field">
            <label>Conteúdo HTML</label>
            <div className="admin-html-toolbar">
              <button type="button" className="btn btn-sm" title="Negrito" onClick={() => handleToolbar('<strong>', '</strong>')}><strong>B</strong></button>
              <button type="button" className="btn btn-sm" title="Itálico" onClick={() => handleToolbar('<em>', '</em>')}><em>I</em></button>
              <button type="button" className="btn btn-sm" title="Sublinhado" onClick={() => handleToolbar('<u>', '</u>')}><u>U</u></button>
              <button type="button" className="btn btn-sm" title="Link" onClick={() => handleToolbar('<a href="">', '</a>')}>Link</button>
              <button type="button" className="btn btn-sm" title="Cor do texto" onClick={handleColorClick}>Cor</button>
              <input ref={colorPickerRef} type="color" style={{ display: 'none' }} onChange={handleColorPick} />
              <button type="button" className="btn btn-sm" title="Parágrafo" onClick={() => handleToolbar('<p>', '</p>')}>P</button>
              <button type="button" className="btn btn-sm" title="Quebra de linha" onClick={() => handleToolbar('<br>', '')}>&lt;br&gt;</button>
            </div>
            <textarea
              ref={htmlRef}
              rows={8}
              value={content.cg_html || ''}
              onChange={(e) => onUpdate('cg_html', e.target.value)}
              placeholder={'<p>Escreva seu conteudo HTML aqui...</p>'}
            />
          </div>
          <div className="admin-row">
            <div className="admin-field">
              <label>Alinhamento</label>
              <select value={content.cg_html_align || 'left'} onChange={(e) => onUpdate('cg_html_align', e.target.value)}>
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Cor do Texto HTML</label>
              <input type="color" value={content.cg_html_color || '#333333'} onChange={(e) => onUpdate('cg_html_color', e.target.value)} />
            </div>
          </div>
        </>
      )}

      <div className="admin-row">
        <div className="admin-field">
          <label>Cor de Fundo</label>
          <input type="color" value={content.cg_bg_color || '#ffffff'} onChange={(e) => onUpdate('cg_bg_color', e.target.value)} />
        </div>
        <div className="admin-field">
          <label>Cor do Texto</label>
          <input type="color" value={content.cg_text_color || '#333333'} onChange={(e) => onUpdate('cg_text_color', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
