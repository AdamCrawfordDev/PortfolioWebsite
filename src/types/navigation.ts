```tsx
export type NavigationItem = {
  id: string
  name: string
  path: string

  subtitle?: string
  date?: string
  location?: string

  description?: string

  highlights?: string[]

  stack?: string[]
  languages?: string[]

  children?: NavigationItem[]
}
```
