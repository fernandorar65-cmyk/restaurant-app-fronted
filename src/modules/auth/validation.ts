import { isNonEmptyString } from '@/utils/string'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(value: string): string | undefined {
  if (!isNonEmptyString(value)) {
    return 'El nombre es obligatorio'
  }

  if (value.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres'
  }

  return undefined
}

export function validateEmail(value: string): string | undefined {
  if (!isNonEmptyString(value)) {
    return 'El correo es obligatorio'
  }

  if (!EMAIL_PATTERN.test(value.trim())) {
    return 'Ingresa un correo válido'
  }

  return undefined
}

export function validatePassword(value: string): string | undefined {
  if (!isNonEmptyString(value)) {
    return 'La contraseña es obligatoria'
  }

  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres'
  }

  return undefined
}
