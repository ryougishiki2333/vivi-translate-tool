import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { PythonShell } from 'python-shell'
import { existsSync } from 'fs'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // 初始化 Python Shell
  // 根据开发/生产环境确定 Python 路径
  let pythonPath: string
  let scriptPath: string

  if (is.dev) {
    // 开发环境：使用项目根目录下的 venv
    const devPythonPath = join(__dirname, '../../python/venv/Scripts/python.exe')
    const devScriptPath = join(__dirname, '../../')
    
    pythonPath = existsSync(devPythonPath) ? devPythonPath : 'python'
    scriptPath = devScriptPath
    
    console.log('[DEV] Python Path:', pythonPath)
    console.log('[DEV] Script Path:', scriptPath)
  } else {
    // 生产环境：使用打包后的路径
    pythonPath = join(process.resourcesPath, 'python/venv/Scripts/python.exe')
    scriptPath = join(process.resourcesPath, 'python')
    
    console.log('[PROD] Python Path:', pythonPath)
  }

  const pyshell = new PythonShell('python/main.py', {
    mode: 'json',
    pythonPath: pythonPath,
    scriptPath: scriptPath
  })

  pyshell.on('message', function (message) {
    console.log('[Python Message]', message.type, ':', JSON.stringify(message.data, null, 2))
    
    // 特别处理 ready 消息
    if (message.type === 'ready') {
      console.log('[Python Backend] Initialized successfully!')
      console.log('  Version:', message.data.version)
      console.log('  Python:', message.data.python_version?.split(' ')[0])
    }
    
    // 通过 mainWindow.webContents.send 发给 React
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('python-message', message)
    }
  })

  pyshell.on('error', function (err) {
    console.error('[Python Error]', err.message)
    console.error('[Python Stack]', err.stack)
    // 将错误也发送到渲染进程
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.send('python-message', {
        type: 'error',
        data: {
          message: err.message,
          stack: err.stack
        }
      })
    }
  })
  
  pyshell.on('stderr', function (stderr) {
    console.error('[Python stderr]', stderr)
  })

  pyshell.on('close', function () {
    console.log('[Python] Process closed')
  })

  // IPC 通信：从渲染进程发送消息到 Python
  ipcMain.on('python-command', (_, command) => {
    console.log('[IPC -> Python]', JSON.stringify(command))
    try {
      pyshell.send(command)
      console.log('[IPC -> Python] Message sent successfully')
    } catch (err) {
      console.error('[IPC -> Python] Failed to send:', err)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
