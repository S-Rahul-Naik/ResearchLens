import json
from copy import deepcopy

with open('workflow-ai-modular.json', 'r', encoding='utf-8') as f:
    base = json.load(f)

wf = deepcopy(base)
wf['name'] = 'ResearchLens 5-Section Analysis (Gemini via OpenAI-Compatible Endpoint)'

for node in wf.get('nodes', []):
    if node.get('type') == '@n8n/n8n-nodes-langchain.lmChatOpenAi':
        node['name'] = node.get('name', '').replace('OpenAI Chat Model', 'Gemini Chat Model')
        node['parameters'] = {
            'model': 'gemini-2.0-flash',
            'temperature': 0.2,
            'maxTokens': 500,
            'options': {
                'baseURL': 'https://generativelanguage.googleapis.com/v1beta/openai/'
            }
        }
        node['credentials'] = {
            'openAiApi': 'gemini_api'
        }

# Rename connection keys to match node name changes
conn = wf.get('connections', {})
repl = {
    'OpenAI Chat Model (Summarization)': 'Gemini Chat Model (Summarization)',
    'OpenAI Chat Model (Gap Detection)': 'Gemini Chat Model (Gap Detection)',
    'OpenAI Chat Model (Trend Detection)': 'Gemini Chat Model (Trend Detection)',
    'OpenAI Chat Model (Visualization)': 'Gemini Chat Model (Visualization)',
    'OpenAI Chat Model (Chatbot)': 'Gemini Chat Model (Chatbot)',
}

new_conn = {}
for k, v in conn.items():
    new_conn[repl.get(k, k)] = v
wf['connections'] = new_conn

with open('workflow-ai-modular-gemini-compatible.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2)

print('Created workflow-ai-modular-gemini-compatible.json')
