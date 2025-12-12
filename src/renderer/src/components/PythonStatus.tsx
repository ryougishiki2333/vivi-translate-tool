import { useEffect, useState } from 'react'

interface PythonMessage {
  type: string
  data?: any
}

function PythonStatus(): React.JSX.Element {
  const [status, setStatus] = useState<string>('等待连接...')
  const [messages, setMessages] = useState<PythonMessage[]>([])

  useEffect(() => {
    // 监听 Python 的消息
    const handlePythonMessage = (_: any, message: PythonMessage): void => {
      console.log('✅ 收到 Python 消息:', message)

      // 添加到消息列表
      setMessages((prev) => [...prev, message])

      // 更新状态
      if (message.type === 'ready') {
        console.log('🎉 Python 后端已就绪!')
        setStatus('✅ Python 后端已就绪')
      } else if (message.type === 'error') {
        setStatus('❌ Python 错误')
      } else {
        setStatus('🔄 Python 运行中')
      }
    }

    window.electron.ipcRenderer.on('python-message', handlePythonMessage)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('python-message')
    }
  }, [])

  // 测试发送命令到 Python
  const sendTestCommand = (): void => {
    window.electron.ipcRenderer.send('python-command', {
      type: 'ping',
      payload: {}
    })
  }

  return (
    <div
      style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
    >
      <h3>Python 后端状态</h3>
      <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{status}</p>

      <button
        onClick={sendTestCommand}
        style={{
          padding: '8px 16px',
          marginTop: '10px',
          cursor: 'pointer',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        测试 Python 连接
      </button>

      {messages.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4>消息日志：</h4>
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                <strong>{msg.type}:</strong> {JSON.stringify(msg.data || {})}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PythonStatus
