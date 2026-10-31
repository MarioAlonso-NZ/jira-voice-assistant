```mermaid
```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    participant UI as Next.js Frontend
    participant API as AWS API Gateway
    participant S3 as Amazon S3
    participant Backend as AWS Lambda
    participant STT as Whisper API
    participant Agent as LangChain Framework
    participant Brain as LLM (Groq)
    participant CRM as Jira REST API

    PM->>UI: Clicks "Record", speaks task, submits
    
    %% New S3 Bypass Flow
    UI->>API: GET /get-presigned-url
    API-->>UI: Return uploadURL & s3_key
    UI->>S3: PUT direct upload (.webm blob)
    S3-->>UI: HTTP 200 OK
    UI->>API: POST /jira-voice-processor { s3_key }
    API->>Backend: Trigger processor function execution
    Backend->>S3: Download audio file via s3_key
    S3-->>Backend: Return audio buffer
    
    %% AI Pipeline
    Backend->>STT: Send audio buffer for transcription
    STT-->>Backend: Return transcribed text
    Backend->>Agent: Pass text and system prompt
    Agent->>Brain: Request intent extraction & structure
    Brain-->>Agent: Return JSON (Title, Description, Epic)
    Agent->>Backend: Execute Jira Webhook Tool with JSON
    
    %% Jira Integration
    Backend->>CRM: Authenticated POST request to /issue endpoint
    CRM-->>Backend: HTTP 201 Created (Returns Ticket ID)
    Backend-->>API: Return success status & Ticket ID
    API-->>UI: Route response to client
    UI-->>PM: Display visual confirmation (Ticket created)