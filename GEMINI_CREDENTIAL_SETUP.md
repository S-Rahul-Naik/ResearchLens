# Quick Gemini Credential Setup for n8n v2.20.6

## Why `gemini_api` Is Not Showing
The current workflow uses the OpenAI Chat Model node for compatibility in this n8n version.
That node only lists OpenAI-type credentials, so Google Gemini(PaLM) credentials will not appear in its credential dropdown.

## Correct Setup (Works With Current Workflow)
1. Go to n8n Settings → Credentials → + Create credential
2. Search for `OpenAI`
3. Select OpenAI API credential type
4. Set credential name to `gemini_openai_api`
5. Paste your Gemini API key as the API key value
6. Save and Test

## Workflow File To Import
Use this workflow:

- workflow-ai-modular-gemini.json

This file is configured with:

- 5 Gemini model nodes using OpenAI-compatible transport
- Node type: `@n8n/n8n-nodes-langchain.lmChatOpenAi`
- Model: `gemini-2.0-flash`
- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Credential mapping: `openAiApi: gemini_openai_api`

## Quick Fallback
If you do not want to create a new credential, you can select `openai_api` in the node and replace its API key with your Gemini key.

## Security Note
If your Gemini key was shown in screenshots or notes, rotate it in Google AI Studio and update the credential.
