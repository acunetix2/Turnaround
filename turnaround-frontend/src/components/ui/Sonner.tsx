import React from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '../../lib/ThemeContext'

export const Toaster: React.FC = () => {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark'}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border-default group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:text-xs font-sans',
          description: 'group-[.toast]:text-text-secondary text-[11px]',
          actionButton:
            'group-[.toast]:bg-[#ED642B] group-[.toast]:text-white font-medium text-xs rounded-lg px-2.5 py-1',
          cancelButton:
            'group-[.toast]:bg-bg-surface-raised group-[.toast]:text-text-secondary text-xs rounded-lg px-2.5 py-1',
          error:
            'group-[.toaster]:border-status-danger/30 group-[.toaster]:bg-status-danger-bg text-status-danger',
          success:
            'group-[.toaster]:border-status-good/30 group-[.toaster]:bg-status-good-bg text-status-good',
          warning:
            'group-[.toaster]:border-status-warning/30 group-[.toaster]:bg-status-warning-bg text-status-warning',
          info:
            'group-[.toaster]:border-[#250C77]/40 group-[.toaster]:bg-[#250C77]/10 text-text-primary',
        },
      }}
    />
  )
}
