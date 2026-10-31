```mermaid
graph LR
    %% Actors and Interfaces
    PM((Project<br>Manager))
    Frontend["Next.js Web App<br>(Netlify/Vercel)"]
    Email((Gmail<br>Notification))

    %% Cloud Infrastructure
    subgraph "AWS Serverless Backend"
        APIGW{"API Gateway"}
        Lambda["AWS Lambda<br>(Python Orchestrators)"]
        S3[("Amazon S3<br>(Voice Uploads)")]
    end

    %% External AI Services
    subgraph "AI Services"
        Whisper["OpenAI Whisper API<br>(Speech-to-Text)"]
        subgraph "AI Agent"
            LangChain["LangChain<br>(Framework)"]
            LLM["LLM<br>(Groq Cloud)"]
        end
    end

    %% Destination
    Jira[("Jira REST API<br>(Atlassian Cloud)")]

    %% Data Flow
    PM -- "Records Audio<br>(Web API)" --> Frontend
    
    %% New S3 Presigned URL Flow
    Frontend -- "1. GET Presigned URL" --> APIGW
    Frontend -- "2. PUT .webm directly" --> S3
    Frontend -- "3. POST s3_key" --> APIGW
    
    APIGW -- "Triggers" --> Lambda
    Lambda -- "Fetches Audio" --> S3
    
    Lambda -- "Audio Buffer" --> Whisper
    Whisper -- "Transcribed Text" --> Lambda
    
    Lambda -- "Text + System Prompt" --> LangChain
    LangChain -- "Reasons & Extracts" --> LLM
    LLM -- "Structured JSON<br>(Title, Desc, Epic)" --> LangChain
    LangChain -- "Tool Call Instruction" --> Lambda
    
    Lambda -- "Authenticated POST<br>(Python requests)" --> Jira
    Jira -- "Ticket Created<br>(HTTP 201)" --> Lambda
    
    Lambda -- "Success Message" --> APIGW
    APIGW -- "HTTP 200 Response" --> Frontend
    Frontend -- "UI Confirmation" --> PM
    
    Jira -. "Assigns Task" .-> Email
    Email -. "Notifies Developer" .-> PM