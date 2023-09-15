import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SnackbarProvider } from 'notistack'

console.log('loading')
const el = document.getElementById('root')
const root = createRoot(el)
root.render(
  <SnackbarProvider>
    <App />
  </SnackbarProvider>
)
console.log('done')
