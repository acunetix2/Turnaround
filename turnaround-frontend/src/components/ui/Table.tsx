import * as React from 'react'

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-xs text-left ${className}`}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <thead ref={ref} className={`[&_tr]:border-b border-border-default bg-bg-surface-raised/40 ${className}`} {...props} />
))
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
))
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t border-border-default bg-bg-surface-raised/50 font-medium ${className}`}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-border-default transition-colors hover:bg-bg-surface-raised/30 data-[state=selected]:bg-bg-surface-raised ${className}`}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <th
    ref={ref}
    className={`h-9 px-3 text-left align-middle font-medium text-text-tertiary uppercase tracking-wider text-[11px] [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <td
    ref={ref}
    className={`p-3 align-middle text-text-secondary text-xs [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
))
TableCell.displayName = 'TableCell'
