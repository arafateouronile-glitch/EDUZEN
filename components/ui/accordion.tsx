"use client"

import * as React from "react"
import { motion, AnimatePresence } from '@/components/ui/motion'
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionProps {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  className?: string
  children: React.ReactNode
}

const AccordionContext = React.createContext<{
  openItems: string[]
  toggleItem: (value: string) => void
}>({
  openItems: [],
  toggleItem: () => {},
})

const Accordion = ({ type = "single", defaultValue, value, onValueChange, className, children }: AccordionProps) => {
  const [internalOpenItems, setInternalOpenItems] = React.useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  )

  // Utiliser value si fourni (mode contrôlé), sinon utiliser l'état interne
  const openItems = value !== undefined 
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : internalOpenItems

  const toggleItem = (itemValue: string) => {
    const newItems = (() => {
      if (type === "single") {
        return openItems.includes(itemValue) ? [] : [itemValue]
      } else {
        return openItems.includes(itemValue)
          ? openItems.filter((item) => item !== itemValue)
          : [...openItems, itemValue]
      }
    })()

    if (onValueChange) {
      onValueChange(type === "single" ? (newItems[0] || '') : newItems)
    } else {
      setInternalOpenItems(newItems)
    }
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem = ({ value, className, children }: AccordionItemProps) => {
  return (
    <div className={cn("border-b border-gray-100 last:border-0", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { value })
        }
        return child
      })}
    </div>
  )
}

interface AccordionTriggerProps {
  className?: string
  children: React.ReactNode
  value?: string
  onClick?: () => void
}

const AccordionTrigger = ({ className, children, value, onClick }: AccordionTriggerProps) => {
  const { openItems, toggleItem } = React.useContext(AccordionContext)
  const isOpen = value ? openItems.includes(value) : false

  const handleClick = () => {
    if (value) {
      toggleItem(value)
    }
    if (onClick) {
      onClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex flex-1 items-center justify-between py-4 w-full font-medium transition-all hover:text-brand-blue text-left",
        isOpen ? "text-brand-blue" : "text-gray-700",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400",
          isOpen && "rotate-180 text-brand-blue"
        )}
      />
    </button>
  )
}

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
  value?: string
}

const AccordionContent = ({ className, children, value }: AccordionContentProps) => {
  const { openItems } = React.useContext(AccordionContext)
  const isOpen = value ? openItems.includes(value) : false

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className={cn("pb-4 pt-0 text-sm text-gray-600", className)}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
