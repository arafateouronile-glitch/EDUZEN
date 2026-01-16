'use client'

import { useRipple } from '@/components/ui/ripple'
import { Ripple } from '@/components/ui/ripple'
import React from 'react'

export function withRipple<P extends object>(
  Component: React.ComponentType<P>
) {
  return function RippleWrapper(props: P & { enableRipple?: boolean }) {
    const { enableRipple = true, ...rest } = props
    const { ref, ripples } = useRipple<HTMLElement>()

    if (!enableRipple) {
      return <Component {...(rest as P)} />
    }

    return (
      <div className="relative overflow-hidden">
        <Component {...(rest as P)} ref={ref} />
        {ripples.map((ripple) => (
          <Ripple
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    )
  }
}
























