from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {
        "message": "AI Companion backend is running 🚀"
    }


@app.post("/chat")
def chat(request: ChatRequest):
    return {
        "reply": f"I received your message: {request.message}"
    }
