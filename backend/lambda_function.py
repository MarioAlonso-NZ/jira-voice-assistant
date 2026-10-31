import os
import json
import urllib.parse
import boto3
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import requests
from requests.auth import HTTPBasicAuth

# Initialize the S3 client
s3_client = boto3.client('s3')

def fetch_active_epics():
    url = "https://cmspro.atlassian.net/rest/api/3/search/jql"
    auth = HTTPBasicAuth("mario.nezzvla@gmail.com", os.getenv("JIRA_API_TOKEN"))
    query = {"jql": 'project="VDT" AND issuetype="Epic"', "fields": "summary"}
    response = requests.get(url, headers={"Accept": "application/json"}, params=query, auth=auth)
    
    epics = response.json().get('issues', [])
    return ", ".join([f"{e['key']} ({e['fields']['summary']})" for e in epics])

class JiraTicket(BaseModel):
    epic_key: str = Field(description="The exact Jira Epic Key (e.g., VDT-1) that best matches the context")
    title: str = Field(description="A concise, clear title for the Jira ticket")
    description: str = Field(description="The main description of the requested feature or bug")
    acceptance_criteria: str = Field(description="BDD format (Given/When/Then) acceptance criteria")
    story_points: int = Field(description="Estimated story points using the Fibonacci sequence (1, 2, 3, 5, 8)")

def process_audio(file_path):
    print(f"Processing downloaded file: {file_path}...")

    # Transcribe audio using Groq's Whisper model
    print("1/3 Transcribing audio with Groq...")
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    with open(file_path, "rb") as audio_file:
        transcript_response = groq_client.audio.transcriptions.create(
            file=(os.path.basename(file_path), audio_file.read()),
            model="whisper-large-v3"
        )
    transcript = transcript_response.text
    print(f"Transcript generated: '{transcript}'")

    # Process with LangChain and Groq
    print("2/3 Generating BDD Jira ticket via Groq...")
    llm = ChatGroq(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_name="openai/gpt-oss-20b", 
        temperature=0
    )
    
    structured_llm = llm.with_structured_output(JiraTicket)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an Agile Product Owner. Convert the transcript into a BDD Jira ticket. Assign it to the most relevant Epic from this list: {available_epics}."),
        ("human", "{transcript}")
    ])

    chain = prompt | structured_llm

    # Execute with the injected context
    print("3/3 Formatting payload...")
    available_epics = fetch_active_epics()
    jira_payload = chain.invoke({
        "transcript": transcript, 
        "available_epics": available_epics
    })
    
    return jira_payload

def create_jira_issue(ticket: JiraTicket):
    url = "https://cmspro.atlassian.net/rest/api/2/issue"
    auth = HTTPBasicAuth("mario.nezzvla@gmail.com", os.getenv("JIRA_API_TOKEN"))
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    
    payload = json.dumps({
        "fields": {
            "project": {"key": "VDT"},
            "summary": ticket.title,
            "description": f"{ticket.description}\n\n*Acceptance Criteria:*\n{ticket.acceptance_criteria}\n\n*Story Points:* {ticket.story_points}",
            "issuetype": {"name": "Story"},
            "parent": {"key": ticket.epic_key}
        }
    })
    
    response = requests.post(url, data=payload, headers=headers, auth=auth)
    return response.json()

def lambda_handler(event, context):
    try:
        # 1. Extract bucket name and file key from the S3 event trigger
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        
        # 2. Download the audio file to Lambda's temporary storage
        download_path = f"/tmp/{os.path.basename(key)}"
        print(f"Downloading {key} from bucket {bucket} to {download_path}...")
        s3_client.download_file(bucket, key, download_path)
        
        # 3. Process the audio to generate the Jira payload
        ticket_data = process_audio(download_path)
        print("Generated Ticket Data:", ticket_data.model_dump_json(indent=2))
        
        # 4. Create the Jira Issue via API
        print("4/4 Sending ticket to Jira...")
        jira_response = create_jira_issue(ticket_data)
        issue_key = jira_response.get('key')
        print(f"Success! Jira ticket created: https://cmspro.atlassian.net/browse/{issue_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Successfully processed {key} and created Jira issue {issue_key}')
        }
        
    except Exception as e:
        print(f"Error processing S3 event: {str(e)}")
        raise e