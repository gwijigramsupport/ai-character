from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()


# Allow the React frontend to communicate with the Python backend
# We are using "*" temporarily during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return {
        "reply": f"I received your message: {request.message}"
    }
