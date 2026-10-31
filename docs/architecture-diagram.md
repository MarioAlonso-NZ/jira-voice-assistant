```mermaid
graph LR
    %% Actors and Interfaces
    PM((Project<br>Manager))
    Frontend["Next.js Web App<br>(Netlify/Vercel)"]
    Email((Gmail<br>Notification))

    %% Cloud Infrastructure
    subgraph "AWS Serverless Backend"
        APIGW{"API Gateway"}
        Lambda["AWS Lambda<br>(Python Orchestrator)"]
    end

    %% External AI Services
    subgraph "AI Services"
        Whisper["OpenAI Whisper API<br>(Speech-to-Text)"]
        subgraph "AI Agent"
            LangChain["LangChain<br>(Framework)"]
            LLM["LLM<br>(Qwen/OpenAI)"]
        end
    end

    %% Destination
    Jira[("Jira REST API<br>(Atlassian Cloud)")]

    %% Data Flow
    PM -- "Records Audio<br>(Web API)" --> Frontend
    Frontend -- "HTTP POST<br>(.webm/.mp3 payload)" --> APIGW
    APIGW -- "Triggers" --> Lambda
    
    Lambda -- "Audio Buffer" --> Whisper
    Whisper -- "Transcribed Text" --> Lambda
    
    Lambda -- "Text + System Prompt" --> LangChain
    LangChain -- "Reasons & Extracts" --> LLM
    LLM -- "Structured JSON<br>(Title, Desc, Epic)" --> LangChain
    LangChain -- "Tool Call Instruction" --> Lambda
    
    Lambda -- "Authenticated POST<br>(Python requests)" --> Jira
    Jira -- "Ticket Created<br>(HTTP 201)" --> Lambda
    
    Lambda -- "Success Message" --> APIGW
    APIGW -- "HTTP 201 Responsw" --> Frontend
    Frontend -- "UI Confirmation" --> PM
    
    Jira -. "Assigns Task" .-> Email
    Email -. "Notifies Developer" .-> PM