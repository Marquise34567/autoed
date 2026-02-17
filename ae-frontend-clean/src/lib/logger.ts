/* eslint-disable no-console */
export const error = (...args: any[]) => {
  console.error(...args)
}

export const warn = (...args: any[]) => {
  console.warn(...args)
}

export const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug(...args)
  }
}

export default {
  error,
  warn,
  debug,
}
