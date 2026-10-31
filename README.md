# Jira Voice Assistant

An end-to-end, serverless web application that allows project managers and developers to dictate tasks using their microphone. The system automatically transcribes the audio, parses it into professional Behavior-Driven Development (BDD) formats (Given/When/Then), and pushes a fully structured ticket directly to a Jira backlog.

## System Architecture

The application uses a decoupled serverless architecture to ensure high availability and bypass API Gateway payload limits:
1. **Frontend:** React (Next.js) captures audio via the browser's MediaRecorder API.
2. **Storage:** The frontend requests an S3 Pre-signed URL to securely upload the raw `.webm` audio directly to an Amazon S3 bucket.
3. **Processing Pipeline:** An AWS API Gateway synchronously triggers a Python Lambda function with the uploaded S3 file key.
4. **AI Integration:** The Lambda function retrieves the file, transcribes it using the Whisper API, and uses LangChain with a Groq LLM to format the unstructured transcription into a professional Jira ticket.

## Tech Stack

**Frontend:**
* Next.js (React)
* Tailwind CSS
* React Hot Toast (UI Notifications)

**AWS Serverless Backend:**
* AWS Lambda (Python 3.13)
* Amazon API Gateway
* Amazon S3
* AWS SAM / CloudFormation (Infrastructure as Code)

**AI & Integrations:**
* LangChain & Groq SDK (LLM orchestration)
* Whisper API (Speech-to-Text)
* Jira REST API (Atlassian)

## Repository Structure

The project is structured as a monorepo containing both the Next.js frontend and the Python serverless backend.

- `/jira-voice-ui`: Contains the Next.js frontend application.
- `/backend`: Contains the AWS Lambda Python processor (`lambda_function.py`), dependency list (`requirements.txt`), and the AWS SAM Infrastructure as Code template (`template.yaml`).
- `/docs`: Contains system architecture and sequence diagrams.

## Infrastructure as Code (IaC)

This project utilizes AWS Serverless Application Model (SAM) for infrastructure provisioning. The `backend/template.yaml` file defines the cloud resources, including the S3 bucket with strict CORS rules, IAM execution roles, the Lambda handlers, and the API Gateway routes. While resources can be deployed manually via the AWS Management Console, this template provides a reproducible, version-controlled cloud environment.

## Local Setup

### Frontend
1. Navigate to the frontend directory: `cd jira-voice-ui`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the UI at `http://localhost:3000`
