export type ProjectLink = {
  label: string
  href: string
  unavailableMessage?: string
}
export type ProjectImageItem = {
  src: string
  alt: string
  caption?: string
}

export type StackGroup = {
  label: string
  items: string[]
}