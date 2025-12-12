#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Vivi Translate Tool - Python Backend
用于与 Electron 主进程通信的 Python 脚本
"""

import sys
import json
import os

# 设置 UTF-8 环境变量（更安全的方式）
if sys.platform == 'win32':
    import io
    # 重新配置 stdout 为 UTF-8，但保持文本模式
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# 添加 lib 目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
lib_path = os.path.join(current_dir, 'lib')
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

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
            # Handle term extraction request
            text = payload.get('text', '')
            terms = run_extraction(text)
            
            # 返回的中文术语通过 JSON 传输，不会乱码
            send_message('extract_terms_result', {
                'success': True,
                'terms': terms,  # 可以包含中文术语，如 ['角色', '技能', 'NPC']
                'count': len(terms),
                'source_text': text  # 原文也可以是中文
            })
            
        elif msg_type == 'translate':
            # Handle translation request
            text = payload.get('text', '')
            source_lang = payload.get('source_lang', 'auto')
            target_lang = payload.get('target_lang', 'zh-CN')
            
            # TODO: 实现真正的翻译逻辑
            # 这里的中文数据通过 JSON 传输，完全没有编码问题
            send_message('translate_result', {
                'success': True,
                'original': text,
                'translated': f'【已翻译】{text}',  # JSON 中的中文没问题
                'source_lang': source_lang,
                'target_lang': target_lang,
                'metadata': {
                    'engine': '翻译引擎名称',  # 中文也没问题
                    'confidence': 0.95,
                    'alternatives': ['备选翻译1', '备选翻译2']  # 中文数组也没问题
                }
            })
            
        elif msg_type == 'ping':
            # 健康检查
            send_message('pong', {
                'status': 'ok',
                'message': 'Python backend is running normally',
                'timestamp': str(os.times())
            })
            
        elif msg_type == 'test':
            # 测试消息
            send_message('test_response', {
                'success': True,
                'message': 'Test successful! Python backend communication is normal',
                'echo': payload
            })
            
        else:
            send_message('error', {
                'message': f'Unknown message type: {msg_type}'
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
