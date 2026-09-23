import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI


app = FastAPI()


# Allow our Vercel frontend to communicate with the backend.
# We can restrict this to the real frontend domain later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Hugging Face token is stored in Render's environment variables.
HF_TOKEN = os.getenv("HF_TOKEN")


# Hugging Face provides an OpenAI-compatible API.
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)


# =========================
# REQUEST MODELS
# =========================

class CharacterData(BaseModel):
    name: str
    age: int
    occupation: str | None = None
    location: str | None = None
    personality: str | None = None
    hobbies: str | None = None
    dressing_style: str | None = None
    about: str | None = None


class ChatMessage(BaseModel):
    sender: str
    content: str


class ChatRequest(BaseModel):
    message: str
    character: CharacterData
    history: list[ChatMessage] = []


# =========================
# HOME / HEALTH CHECK
# =========================

@app.get("/")
def home():
    return {
        "message": "AI Companion backend is running 🚀"
    }


# =========================
# CHAT
# =========================

@app.post("/chat")
def chat(request: ChatRequest):

    character = request.character

    system_prompt = f"""
You are {character.name}, an AI character in an AI companion application.

Your character information:

Name:
{character.name}

Age:
{character.age}

Occupation:
{character.occupation or "Not specified"}

Location:
{character.location or "Not specified"}

Personality:
{character.personality or "Friendly and conversational"}

Hobbies:
{character.hobbies or "Not specified"}

Dressing style:
{character.dressing_style or "Not specified"}

About:
{character.about or "No additional information provided."}

You must behave consistently with this character's personality,
background, interests, and style.

You are warm, natural and conversational.

Do not say that you are a language model unless the user
specifically asks about your AI nature.

Do not claim to be a real human.

Keep normal conversation reasonably concise and natural.
"""


    # Build the conversation for the AI.
    ai_messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]


    # Add previous conversation history.
    for message in request.history:

        if message.sender == "user":
            ai_messages.append(
                {
                    "role": "user",
                    "content": message.content,
                }
            )

        elif message.sender == "ai":
            ai_messages.append(
                {
                    "role": "assistant",
                    "content": message.content,
                }
            )


    # Add the new user message.
    ai_messages.append(
        {
            "role": "user",
            "content": request.message,
        }
    )


    # Send conversation to Hugging Face.
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b:fastest",
        messages=ai_messages,
    )


    reply = response.choices[0].message.content


    return {
        "reply": reply
    }