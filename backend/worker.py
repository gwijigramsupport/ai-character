import os
import modal
from modal import App, Image, Volume

animatediff_image = (
    Image.debian_slim()
    .pip_install(
        "torch", "transformers", "diffusers", "accelerate", 
        "safetensors", "requests", "peft", "supabase"
    )
)

app = App("animatediff_app", image=animatediff_image)
volume = Volume.from_name("model-cache", create_if_missing=True)
MODEL_DIR = "/data/models"

@app.function(gpu="A10G", volumes={MODEL_DIR: volume}, timeout=600)
def generate_video_pipeline(prompt: str, negative_prompt: str, steps: int, frames: int, sb_url: str, sb_key: str) -> str:
    import torch
    from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
    from diffusers.utils import export_to_gif
    from supabase import create_client

    # 1. ... (Your existing model loading & frame diffusion code runs here) ...
    local_output_path = "/tmp/output.gif"

    # 2. Upload directly to your free Supabase storage bucket
    print("📤 Uploading animated loop to free Supabase Storage...")
    supabase = create_client(sb_url, sb_key)

    file_name = f"generation_{os.urandom(4).hex()}.gif"

    with open(local_output_path, "rb") as f:
        file_data = f.read()

    bucket_name = "character-videos"

    supabase.storage.from_(bucket_name).upload(
        path=file_name,
        file=file_data,
        file_options={"content-type": "image/gif"}
    )

    # 3. Get the free public CDN link
    public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
    return public_url

# ✅ ADDED: This makes the URL work (Option B)
@app.function(gpu="A10G", volumes={MODEL_DIR: volume}, timeout=600)
@modal.fastapi_endpoint(method="POST")
def generate(item: dict):
    # Call your main pipeline as a remote job
    result_url = generate_video_pipeline.remote(
        prompt=item.get("prompt", ""),
        negative_prompt=item.get("negative_prompt", ""),
        steps=int(item.get("steps", 20)),
        frames=int(item.get("frames", 16)),
        sb_url=item.get("sb_url"),
        sb_key=item.get("sb_key")
    )
    return {"video_url": result_url}

# ✅ ADDED: Simple health check so you can open URL in browser
@app.function()
@modal.fastapi_endpoint(method="GET")
def health():
    return {"status": "alive", "engine": "animatediff_app"}
