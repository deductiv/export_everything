import React from 'react'

export function LoadingOverlayAppConfig () {
  return (
    <div
      id='loading_overlay'
      style={{
        position: 'fixed',
        left: 0,
        zIndex: 9999,
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'rgba(255, 255, 255, 0.5)'
      }}
    >
      <div style={{
        height: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <span className='spinner_appconfig' />
      </div>
    </div>
  )
}

export function LoadingOverlayFileBrowser () {
  return (
    <div
      id='loading_overlay_file_browser'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'rgba(0,0,0,0.6)'
      }}
    >
      <div style={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <span className='spinner_filebrowser' />
      </div>
    </div>
  )
}
