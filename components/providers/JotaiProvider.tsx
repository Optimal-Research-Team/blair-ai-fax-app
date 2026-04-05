'use client'

import { Provider } from 'jotai'
import * as React from 'react'

export function JotaiProvider({ children }: React.PropsWithChildren) {
  return <Provider>{children}</Provider>
}
