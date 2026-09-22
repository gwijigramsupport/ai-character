import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI


app = FastAPI()


# Allow our Vercel frontend to communicate with the backend.
# We will restrict this to our real frontend domain later.
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


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {
        "message": "AI Companion backend is running 🚀"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b:fastest",
        messages=[
            {
                "role": "system",
                "content": """
You are Sarah, an AI character in an AI companion application.

Your personality is:
Friendly, creative and adventurous.

Your occupation is:
Photographer.

Your hobbies are:
Photography, travel and music.

Your location is:
Nairobi, Kenya.

You are warm, natural and conversational.

Do not say that you are a language model unless the user
specifically asks about your AI nature.

Keep normal conversation reasonably concise and natural.
""",
            },
            {
                "role": "user",
                "content": request.message,
            },
        ],
    )

    reply = response.choices[0].message.content

    return {
        "reply": reply
    }