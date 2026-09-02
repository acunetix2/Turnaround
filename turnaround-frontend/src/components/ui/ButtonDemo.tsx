import { Mail } from 'lucide-react'
import { Button } from './Button'

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Button rest</Button>
      <Button variant="primary" loading>
        Button loading
      </Button>
      <Button variant="primary" icon={<Mail />}>
        Button icon
      </Button>
      <Button variant="primary" iconRight={<Mail />}>
        Button iconRight
      </Button>

      {/* Secondary Brand Color (#250C77) */}
      <Button variant="secondary" icon={<Mail />}>
        Button Secondary
      </Button>

      {/* Outline & Default Variants */}
      <Button variant="default">Button default</Button>
      <Button variant="outline">Button outline</Button>
    </div>
  )
}
