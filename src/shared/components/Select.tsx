import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption<Value extends string> = {
  label: string
  value: Value
}

type SelectProps<Value extends string> = {
  value: Value
  options: readonly SelectOption<Value>[]
  onValueChange: (value: Value) => void
  ariaLabel: string
  className?: string
}

export function Select<Value extends string>({ value, options, onValueChange, ariaLabel, className = '' }: SelectProps<Value>) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(nextValue) => onValueChange(nextValue as Value)}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-outline bg-app px-3 py-2 text-sm text-text transition outline-none hover:border-muted ${className}`}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="start"
          sideOffset={4}
          className="ui-surface z-50 min-w-(--radix-select-trigger-width) overflow-hidden p-1 text-text">
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-surface-raised data-highlighted:text-text">
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center text-accent">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
