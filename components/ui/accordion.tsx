"use client"

import * as React from "react"
import { motion, AnimatePresence } from '@/components/ui/motion'
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionProps {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
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

const Accordion = ({ type = "single", defaultValue, className, children }: AccordionProps) => {
  const [openItems, setOpenItems] = React.useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  )

  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      if (type === "single") {
        return prev.includes(value) ? [] : [value]
      } else {
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      }
    })
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
}

const AccordionTrigger = ({ className, children, value }: AccordionTriggerProps) => {
  const { openItems, toggleItem } = React.useContext(AccordionContext)
  const isOpen = value ? openItems.includes(value) : false

  return (
    <button
      type="button"
      onClick={() => value && toggleItem(value)}
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
