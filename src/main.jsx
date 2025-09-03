import React from 'react'
import ReactDOM from 'react-dom/client'
import InstagramStories from './instagramstories.jsx'
import InstagramGallery from './instagramgallery.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InstagramStories />
    <InstagramGallery />
  </React.StrictMode>
)
