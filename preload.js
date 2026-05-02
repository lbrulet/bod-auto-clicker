const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectZone:       (i)   => ipcRenderer.invoke('select-zone', i),
  startAutomation:  (cfg) => ipcRenderer.invoke('start-automation', cfg),
  stopAutomation:   ()    => ipcRenderer.invoke('stop-automation'),
  previewZone:      (i)   => ipcRenderer.invoke('preview-zone', i),
  getStats:         ()    => ipcRenderer.invoke('get-stats'),
  getHistory:       ()    => ipcRenderer.invoke('get-history'),
  setWindowHeight:  (h)   => ipcRenderer.invoke('set-window-height', h),

  onOCRReady:          (cb) => ipcRenderer.on('ocr-ready',          () => cb()),
  onOCRError:          (cb) => ipcRenderer.on('ocr-error',          (_, m) => cb(m)),
  onOCRUpdate:         (cb) => ipcRenderer.on('ocr-update',         (_, d) => cb(d)),
  onAutomationStopped: (cb) => ipcRenderer.on('automation-stopped', (_, d) => cb(d)),
  onCounterUpdate:     (cb) => ipcRenderer.on('counter-update',     (_, d) => cb(d)),
  onUpdateAvailable:   (cb) => ipcRenderer.on('update-available',   (_, v) => cb(v)),
  onUpdateDownloaded:  (cb) => ipcRenderer.on('update-downloaded',  () => cb()),
});
