/**
 * EthicFlow — UI primitives barrel
 * Single import point for all design-system components.
 *   import { Button, Card, PageHeader } from '@/components/ui'
 */

export { default as Button }          from './Button'
export { default as IconButton }      from './IconButton'
export { default as Card, CardHeader, CardBody, CardFooter } from './Card'
export { default as Badge }           from './Badge'
export { default as Spinner }         from './Spinner'
export { default as Input }           from './Input'
export { default as Textarea }        from './Textarea'
export { default as Select }          from './Select'
export { default as FormField }       from './FormField'
export { default as PageHeader }      from './PageHeader'
export { default as StatCard }        from './StatCard'
export { default as EmptyState }      from './EmptyState'
export { default as Skeleton }        from './Skeleton'
export { default as Tabs }            from './Tabs'
export { default as Modal }           from './Modal'
export { default as Table }           from './Table'
export { default as AccessibleIcon }  from './AccessibleIcon'
export { default as VisuallyHidden }  from './VisuallyHidden'
export { default as LanguageSwitcher } from './LanguageSwitcher'
export { default as AnnounceRegion }   from './AnnounceRegion'
export { useAnnounce } from '../../hooks/useAnnounce'
