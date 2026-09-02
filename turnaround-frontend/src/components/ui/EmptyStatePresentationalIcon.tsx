import { Database, Plus } from 'lucide-react'
import { Button } from './Button'
import { EmptyStatePresentational } from './EmptyStatePresentational'

export function EmptyStatePresentationalIcon() {
  return (
    <EmptyStatePresentational
      icon={Database}
      title="Create a vector bucket"
      description="Store, index, and query your vector embeddings at scale."
    >
      <Button size="tiny" variant="primary" icon={<Plus size={14} />}>
        Create bucket
      </Button>
    </EmptyStatePresentational>
  )
}
