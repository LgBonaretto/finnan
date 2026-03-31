import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface Props {
  spent: number
  limit: number
  percent: number | null
}

export function BudgetProgressBar({ spent, limit, percent }: Props) {
  const displayPercent = percent ?? 0
  const clampedWidth = Math.min(displayPercent, 100)

  const barColor =
    displayPercent > 80
      ? 'bg-red-500'
      : displayPercent > 60
        ? 'bg-yellow-500'
        : 'bg-green-500'

  const textColor =
    displayPercent > 80 ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
      <p className={cn('text-xs', textColor)}>
        {formatMoney(spent)} de {formatMoney(limit)}
        {percent !== null && ` (${percent}%)`}
      </p>
    </div>
  )
}
