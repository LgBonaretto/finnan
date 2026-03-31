const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatMoney(value: number | string | { toNumber?: () => number }): string {
  let num: number
  if (typeof value === 'string') {
    num = Number(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
  } else if (typeof value === 'number') {
    num = value
  } else if (value && typeof value.toNumber === 'function') {
    num = value.toNumber()
  } else {
    num = Number(value)
  }
  return BRL.format(num)
}

export function parseMoney(str: string): string {
  const cleaned = str
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const num = Number(cleaned)
  if (isNaN(num) || num < 0) {
    throw new Error('Valor monetário inválido')
  }

  return num.toFixed(2)
}
