import { toast } from 'sonner'

export function handleActionError(result: {
  success: false
  error: string
  isClientError: boolean
}) {
  if (result.isClientError) {
    toast.error('An error occurred, please try again later')
  }
  console.error('Action failed:', result.error)
}
