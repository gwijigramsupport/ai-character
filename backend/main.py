import os
import uuid
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import modal  # Run: pip install modal

app = FastAPI()

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# CLIENT SETUP
# =========================
HF_TOKEN = os.getenv("HF_TOKEN")
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

# In-memory database simulation for tracking jobs
# Note: For production, replace this with your Supabase / Database logic
VIDEO_JOBS_DB = {}

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
    memories: list[str] = []

class VideoRequest(BaseModel):
    prompt: str
    negative_prompt: str | None = "low quality, blurry, distorted"
    steps: int = 25
    frames: int = 16  # AnimateDiff standard loop size

# =========================
# HOME / HEALTH CHECK
# =========================
@app.get("/")
def home():
    return {"message": "AI Companion & Video backend is running 🚀"}

# =========================
# CHAT ENDPOINT (Your Existing Code)
# =========================
@app.post("/chat")
def chat(request: ChatRequest):
    character = request.character
    system_prompt = f"You are {character.name}..." # Kept clean for brevity
    
    # ... Rest of your existing chat assembly logic ...
    
    ai_messages = [{"role": "system", "content": system_prompt}]
    ai_messages.append({"role": "user", "content": request.message})
    
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b:fastest",
        messages=ai_messages,
    )
    return {"reply": response.choices[0].message.content}

# =========================
# BACKGROUND WORKER TASK
# =========================
def trigger_modal_animatediff(job_id: str, prompt: str, negative_prompt: str, steps: int, frames: int):
    """
    This helper function runs in the background of your FastAPI server.
    It triggers your external uncensored Python container on Modal.
    """
    try:
        # Connect to your pre-deployed Modal function named 'animatediff_app'
        f = modal.Function.lookup("animatediff_app", "generate_video_pipeline")
        
        # Call the remote GPU worker with your parameters
        # The remote worker should process the video and return a cloud storage URL (like S3/R2)
        video_url = f.remote(
            prompt=prompt, 
            negative_prompt=negative_prompt, 
            steps=steps, 
            frames=frames
        )
        
        # Update your database tracking entry when completed successfully
        VIDEO_JOBS_DB[job_id] = {
            "status": "completed",
            "video_url": video_url,
            "error": None
        }
    except Exception as e:
        # Catch infrastructure or runtime exceptions without crashing the main API
        VIDEO_JOBS_DB[job_id] = {
            "status": "failed",
            "video_url": None,
            "error": str(e)
        }

# =========================
# VIDEO ENDPOINTS
# =========================
@app.post("/video/generate")
def generate_video(request: VideoRequest, background_tasks: BackgroundTasks):
    """
    Initiates an uncensored AnimateDiff generation.
    Returns immediately with a job tracking token.
    """
    job_id = str(uuid.uuid4())
    
    # Set the initial state in your tracking database
    VIDEO_JOBS_DB[job_id] = {
        "status": "processing",
        "video_url": None,
        "error": None
    }
    
    # Hand off the network execution to FastAPI background worker thread
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
        "message": "Video generation started in background."
    }

@app.get("/video/status/{job_id}")
def get_video_status(job_id: str):
    """
    Endpoint for frontend to check generation status.
    """
    job = VIDEO_JOBS_DB.get(job_id)
    if not job:
        return {"status": "error", "message": "Job ID not found."}
        
    return job
