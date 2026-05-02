const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  confirm: (rect) => ipcRenderer.send('zone-confirmed', rect),
  cancel:  ()     => ipcRenderer.send('zone-cancelled'),
});
