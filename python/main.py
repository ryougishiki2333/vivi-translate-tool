#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Vivi Translate Tool - Python Backend
用于与 Electron 主进程通信的 Python 脚本
"""

import sys
import json
import os

# 强制设置 UTF-8 编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# 添加 lib 目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
lib_path = os.path.join(current_dir, 'lib')
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

# 确保能找到 KeywordGacha 的模块
sys.path.append(os.path.join(current_dir, 'lib/KeywordGacha'))

# 确保能找到 KeywordGacha 的模块
sys.path.append(os.path.join(current_dir, 'lib/KeywordGacha'))


def send_message(message_type, data):
    """发送消息到 Electron 主进程"""
    message = {
        'type': message_type,
        'data': data
    }
    print(json.dumps(message, ensure_ascii=False), flush=True)


def run_extraction(text_content):
    """术语提取功能（待实现）"""
    # TODO: 集成 KeywordGacha
    # from module.task import Task
    return ["Term1", "Term2", "Saber"]  # 假数据


def handle_message(message):
    """处理来自 Electron 的消息"""
    try:
        msg_type = message.get('type')
        payload = message.get('payload', {})
        
        if msg_type == 'extract_terms':
            # 处理术语提取请求
            text = payload.get('text', '')
            terms = run_extraction(text)
            send_message('extract_terms_result', {
                'success': True,
                'terms': terms,
                'count': len(terms)
            })
            
        elif msg_type == 'translate':
            # 处理翻译请求
            text = payload.get('text', '')
            # TODO: 实现翻译逻辑
            send_message('translate_result', {
                'success': True,
                'original': text,
                'translated': f'[已翻译] {text}'
            })
            
        elif msg_type == 'ping':
            # 健康检查
            send_message('pong', {
                'status': 'ok',
                'message': 'Python 后端正常运行',
                'timestamp': str(os.times())
            })
            
        elif msg_type == 'test':
            # 测试消息
            send_message('test_response', {
                'success': True,
                'message': '🎉 测试成功！Python 后端通信正常',
                'echo': payload
            })
            
        else:
            send_message('error', {
                'message': f'未知的消息类型: {msg_type}'
            })
            
    except Exception as e:
        send_message('error', {
            'message': str(e),
            'type': 'handler_error'
        })


def main():
    """主循环：读取 stdin 并处理消息"""
    send_message('ready', {
        'status': 'Python backend is ready',
        'version': '1.0.0',
        'python_version': sys.version
    })
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                message = json.loads(line)
                handle_message(message)
            except json.JSONDecodeError as e:
                send_message('error', {
                    'message': f'Invalid JSON: {str(e)}',
                    'type': 'json_error'
                })
                
    except KeyboardInterrupt:
        send_message('shutdown', {'status': 'Shutting down gracefully'})
    except Exception as e:
        send_message('error', {
            'message': f'Fatal error: {str(e)}',
            'type': 'fatal_error'
        })


if __name__ == '__main__':
    main()
