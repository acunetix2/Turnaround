import React, { createContext, useContext, useState, useEffect, useRef, useId } from 'react'
import { Search } from 'lucide-react'

// ── CONTEXT ──
interface CommandContextType {
  search: string
  setSearch: (s: string) => void
  selectedIndex: number
  setSelectedIndex: (idx: number) => void
  filteredCount: number
  registerItem: (id: string, text: string) => () => void
  onItemSelect?: (value: string) => void
}

const CommandContext = createContext<CommandContextType>({
  search: '',
  setSearch: () => {},
  selectedIndex: 0,
  setSelectedIndex: () => {},
  filteredCount: 0,
  registerItem: () => () => {},
})

// ── COMMAND ROOT ──
export interface CommandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  children: React.ReactNode
  className?: string
  onSelect?: (value: string) => void
}

export const Command: React.FC<CommandProps> = ({
  children,
  className = '',
  onSelect,
  ...props
}) => {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemsRef = useRef<Map<string, string>>(new Map())

  const registerItem = (id: string, text: string) => {
    itemsRef.current.set(id, text)
    return () => {
      itemsRef.current.delete(id)
    }
  }

  // Count items matching search
  const filteredItems = Array.from(itemsRef.current.entries()).filter(([, text]) =>
    text.toLowerCase().includes(search.toLowerCase())
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item && onSelect) {
        onSelect(item[1])
      }
    }
  }

  return (
    <CommandContext.Provider
      value={{
        search,
        setSearch,
        selectedIndex,
        setSelectedIndex,
        filteredCount: filteredItems.length,
        registerItem,
        onItemSelect: onSelect,
      }}
    >
      <div
        onKeyDown={handleKeyDown}
        className={`flex h-full w-full flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface text-text-primary ${className}`}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

// ── COMMAND INPUT ──
export interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className = '', placeholder = 'Type a command or search...', ...props }, ref) => {
    const { search, setSearch, setSelectedIndex } = useContext(CommandContext)

    return (
      <div className="flex items-center border-b border-border-default px-3 bg-bg-surface-raised/30">
        <Search size={14} className="mr-2 shrink-0 text-text-tertiary" />
        <input
          ref={ref}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelectedIndex(0)
          }}
          placeholder={placeholder}
          className={`flex h-10 w-full rounded-md bg-transparent py-2.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = 'CommandInput'

// ── COMMAND LIST ──
export interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const CommandList: React.FC<CommandListProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`max-h-[300px] overflow-y-auto overflow-x-hidden p-1.5 scrollbar-thin ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// ── COMMAND EMPTY ──
export const CommandEmpty: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const { filteredCount } = useContext(CommandContext)
  if (filteredCount > 0) return null

  return (
    <div className={`py-6 text-center text-xs text-text-tertiary ${className}`}>{children}</div>
  )
}

// ── COMMAND GROUP ──
export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const CommandGroup: React.FC<CommandGroupProps> = ({
  heading,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`overflow-hidden p-1 text-text-primary ${className}`} {...props}>
      {heading && (
        <div className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-tertiary">
          {heading}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

// ── COMMAND SEPARATOR ──
export const CommandSeparator: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`-mx-1 my-1 h-px bg-border-default ${className}`} />
}

// ── COMMAND ITEM ──
export interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ value, onSelect, disabled = false, children, className = '', ...props }, ref) => {
    const id = useId()
    const { search, registerItem, onItemSelect } = useContext(CommandContext)
    const textContent = typeof children === 'string' ? children : value || ''

    useEffect(() => {
      return registerItem(id, textContent)
    }, [id, textContent, registerItem])

    const matches =
      !search ||
      textContent.toLowerCase().includes(search.toLowerCase()) ||
      (value && value.toLowerCase().includes(search.toLowerCase()))

    if (!matches) return null

    const handleSelect = () => {
      if (disabled) return
      onSelect?.()
      if (value) onItemSelect?.(value)
    }

    return (
      <div
        ref={ref}
        role="option"
        aria-disabled={disabled}
        onClick={handleSelect}
        className={`relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs text-text-secondary outline-none transition-colors hover:bg-bg-surface-raised hover:text-text-primary ${
          disabled ? 'pointer-events-none opacity-40' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandItem.displayName = 'CommandItem'

// ── COMMAND SHORTCUT ──
export const CommandShortcut: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <span
      className={`ml-auto font-mono text-[10px] tracking-widest text-text-tertiary bg-bg-surface-raised px-1.5 py-0.5 rounded border border-border-default ${className}`}
    >
      {children}
    </span>
  )
}

// ── COMMAND DIALOG (MODAL) ──
export interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const CommandDialog: React.FC<CommandDialogProps> = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden shadow-2xl rounded-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
