import validator from 'validator'
import { booleanize } from './Helpers'

export const validators = {
  number: (value) => {
    if (value === undefined || !validator.isFloat(value) || !validator.isInt(value)) {
      return { isValid: false }
    }
    return { isValid: true }
  },
  bool: (value) => {
    if (value === undefined || (value !== true && value !== false)) {
      return { isValid: false }
    }
    return { isValid: true }
  },
  is_true: (value) => {
    return { isValid: booleanize(value) }
  },
  string: (value) => {
    if (value === undefined || validator.isEmpty(value) || !validator.isAscii(value)) {
      return { isValid: false }
    }
    return { isValid: true }
  },
  time: (value) => {
    if (value === undefined || !validator.isDate(value)) {
      return { isValid: false }
    }
    return true
  },
  uuid: (value) => {
    if (value === undefined || !validator.isUUID(value, 4)) {
      return { isValid: false }
    }
    return { isValid: true }
  },
  none: { isValid: true }
}
