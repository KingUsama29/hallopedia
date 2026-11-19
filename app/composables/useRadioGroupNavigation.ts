export function handleRadioGroupKeydown<T extends string>(
  event: KeyboardEvent,
  values: readonly T[],
  currentValue: T,
  onSelect: (nextValue: T) => void,
) {
  const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  const isPrev = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  if (!isNext && !isPrev) return
  if (!values.length) return

  event.preventDefault()
  const idx = Math.max(0, values.indexOf(currentValue))
  const delta = isNext ? 1 : -1
  const nextIdx = (idx + delta + values.length) % values.length
  onSelect(values[nextIdx]!)

  const groupEl = event.currentTarget as HTMLElement | null
  const radios = groupEl?.querySelectorAll<HTMLElement>('[role="radio"]')
  radios?.[nextIdx]?.focus()
}

