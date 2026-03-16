// Using react-hot-toast — this file re-exports for convenience
import toast from 'react-hot-toast'

export { toast }

export const showSuccess = (message) =>
  toast.success(message, {
    style: {
      borderRadius: '12px',
      background: '#333333',
      color: '#fff',
    },
  })

export const showError = (message) =>
  toast.error(message, {
    style: {
      borderRadius: '12px',
      background: '#333333',
      color: '#fff',
    },
  })
