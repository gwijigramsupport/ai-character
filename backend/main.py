import os
import uuid
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# ==========================================
# CONSTANTS & ENVIRONMENT VARIABLES
# ==========================================
# Load the .env file from the root directory of your project
load_dotenv(dotenv_path="../.env")

HF_TOKEN = os.getenv("HF_TOKEN")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

# ==========================================
# INITIALIZATION
# ==========================================
app = FastAPI()

# In-memory store to keep track of background video tasks
# production note: swap this with a real Supabase database table state later if needed
VIDEO_JOBS_DB = {}

# ==========================================
# CORS CONFIGURATION
# ==========================================
# Restricts incoming calls to your verified development and production links
ALLOWED_ORIGINS = [
    "http://localhost:5173",             # Local Vite React client port
    "http://localhost:3000",             # Alternative local port
    "https://vercel.app"   # Replace with your live Vercel domain later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Initialize the Hugging Face Serverless client
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

# ==========================================
# REQUEST & RESPONSE MODELS
# ==========================================
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
    memories: list[str] = []


class VideoRequest(BaseModel):
    prompt: str
    negative_prompt: str | None = "low quality, blurry, distorted, realistic anatomy imperfections"
    steps: int = 25
    frames: int = 16

# ==========================================
# HOME / HEALTH CHECK
# ==========================================
@app.get("/")
def home():
    return {
        "message": "AI Companion & Video Generation backend is running 🚀"
    }

# ==========================================
# CONVERSATIONAL CHAT ROUTE
# ==========================================
@app.post("/chat")
def chat(request: ChatRequest):
    character = request.character

    # =========================
    # CHARACTER PROMPT
    # =========================
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

    # =========================
    # ADD LONG-TERM MEMORIES
    # =========================
    if request.memories:
        memory_text = "\n".join(
            f"- {memory}"
            for memory in request.memories
        )

        system_prompt += f"""

Long-term memories about the user:

{memory_text}

Use these memories naturally when they are relevant
to the conversation.

Do not mention the existence of a memory database unless
the user specifically asks about how your memory works.

Do not assume that every memory is relevant to every message.
"""

    # =========================
    # BUILD AI CONVERSATION
    # =========================
    ai_messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    # =========================
    # PREVIOUS CHAT HISTORY
    # =========================
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

    # =========================
    # CURRENT USER MESSAGE
    # =========================
    ai_messages.append(
        {
            "role": "user",
            "content": request.message,
        }
    )

    # =========================
    # SEND TO HUGGING FACE
    # =========================
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b:fastest",
        messages=ai_messages,
    )

    reply = response.choices[0].message.content

    return {
        "reply": reply
    }

# ==========================================
# ASYMPTOTIC BACKGROUND WORKER TASK
# ==========================================
def trigger_modal_animatediff(job_id: str, prompt: str, negative_prompt: str, steps: int, frames: int):
    """
    Executes on a sub-thread inside FastAPI. Handshakes safely with Modal
    and updates the local state once the asset hits your Supabase Bucket.
    """
    try:
        import modal
        
        # Reference the deployed Modal application architecture function
        f = modal.Function.lookup("animatediff_app", "generate_video_pipeline")
        
        # Fire remote invocation passing credentials securely
        video_url = f.remote(
            prompt=prompt,
            negative_prompt=negative_prompt,
            steps=steps,
            frames=frames,
            sb_url=SUPABASE_URL,
            sb_key=SUPABASE_ANON_KEY
        )
        
        # Save output URL metadata on completion
        VIDEO_JOBS_DB[job_id] = {
            "status": "completed",
            "video_url": video_url,
            "error": None
        }
    except Exception as e:
        VIDEO_JOBS_DB[job_id] = {
            "status": "failed",
            "video_url": None,
            "error": str(e)
        }

# ==========================================
# VIDEO LIFECYCLE ENDPOINTS
# ==========================================
@app.post("/video/generate")
def generate_video(request: VideoRequest, background_tasks: BackgroundTasks):
    """
    Initializes an asynchronous animation frame request.
    Returns immediately with a tracking ID.
    """
    job_id = str(uuid.uuid4())
    
    # Write processing entry to in-memory state tracking dictionary
    VIDEO_JOBS_DB[job_id] = {
        "status": "processing",
        "video_url": None,
        "error": None
    }
    
    # Hand the remote network task off to FastAPI's background thread worker pools
    background_tasks.add_task(
        trigger_modal_animatediff,
        job_id=job_id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        steps=request.steps,
        frames=request.frames
    )
    
    return {
        "status": "queued",
        "job_id": job_id,
        "message": "Video generation pipeline dispatched successfully."
    }


@app.get("/video/status/{job_id}")
def get_video_status(job_id: str):
    """
    Polled periodically by your React application frontend to map state variations.
    """
    job = VIDEO_JOBS_DB.get(job_id)
    if not job:
        return {"status": "error", "message": "Provided Job ID does not match records."}
        
    return job