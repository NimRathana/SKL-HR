'use client'

import { useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import ThemeCustomizer from '@components/theme/ThemeCustomizer'

const LayoutCustomizerButton = ({ isVisible = true }) => {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(200)
  const buttonRef = useRef(null)
  const dragOffset = useRef(0)
  const dragStartTop = useRef(200)
  const hasDragged = useRef(false)
  const theme = useTheme()

  if (!isVisible) return null

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => {
          if (hasDragged.current) {
            hasDragged.current = false
            return
          }

          setOpen(true)
        }}
        onPointerDown={event => {
          dragOffset.current = event.clientY - top
          dragStartTop.current = top
          hasDragged.current = false
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return

          const buttonHeight = event.currentTarget.offsetHeight
          const maxTop = window.innerHeight - buttonHeight
          const nextTop = Math.min(Math.max(event.clientY - dragOffset.current, 0), maxTop)

          if (Math.abs(nextTop - dragStartTop.current) > 3) {
            hasDragged.current = true
          }

          if (buttonRef.current) {
            buttonRef.current.style.top = `${nextTop}px`
          }
        }}
        onPointerUp={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }

          if (buttonRef.current) {
            setTop(parseFloat(buttonRef.current.style.top))
          }
        }}
        className="pulse"
        style={{
          position: 'fixed',
          top,
          insetInlineEnd: 0,
          insetInlineStart: 'auto',
          touchAction: 'none',
          cursor: 'grab',
          zIndex: theme.zIndex.appBar + 1,
          width: 40,
          height: 40,
          borderStartStartRadius: 20,
          borderEndStartRadius: 20,
          backgroundColor: theme.palette.primary.main,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'none',
        }}
      >
        <i className="ri-palette-line" />
      </button>

      <ThemeCustomizer open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default LayoutCustomizerButton
