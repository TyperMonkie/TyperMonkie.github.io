import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import SiteRouter from './SiteRouter'

createRoot(document.getElementById('root')).render(
  <StrictMode><SiteRouter /></StrictMode>,
)
