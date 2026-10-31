```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    participant UI as Next.js Frontend
    participant API as AWS API Gateway
    participant Backend as AWS Lambda
    participant STT as Whisper API
    participant Agent as LangChain Framework
    participant Brain as LLM (Qwen/OpenAI)
    participant CRM as Jira REST API

    PM->>UI: Clicks "Record", speaks task, submits
    UI->>API: POST /audio-payload
    API->>Backend: Trigger function execution
    Backend->>STT: Send audio buffer for transcription
    STT-->>Backend: Return transcribed text
    Backend->>Agent: Pass text and system prompt
    Agent->>Brain: Request intent extraction & structure
    Brain-->>Agent: Return JSON (Title, Description, Epic)
    Agent->>Backend: Execute Jira Webhook Tool with JSON
    Backend->>CRM: Authenticated POST request to /issue endpoint
    CRM-->>Backend: HTTP 201 Created (Returns Ticket ID)
    Backend-->>API: Return success status & Ticket ID
    API-->>UI: Route response to client
    UI-->>PM: Display visual confirmation (Ticket created)