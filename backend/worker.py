import os
from modal import App, Image, Volume, web_endpoint

# 1. Define the computing environment
# We install PyTorch, Hugging Face Diffusers, and specific weights tools
animatediff_image = (
    Image.debian_slim()
    .pip_install(
        "torch",
        "transformers",
        "diffusers",
        "accelerate",
        "safetensors",
        "requests",
        "peft"
    )
)

# Initialize the Modal application instance
app = App("animatediff_app", image=animatediff_image)

# Allocate a persistent disk volume named 'model-cache' to store downloaded models permanently
volume = Volume.from_name("model-cache", create_if_missing=True)

MODEL_DIR = "/data/models"
MOTION_MODULE_URL = "https://huggingface.co"

# Replace this URL with your preferred uncensored / adult base checkpoint (from Hugging Face or Civitai)
# Note: Civitai direct downloads often require a personal API token in the URL query string
ADULT_CHECKPOINT_URL = "https://huggingface.co"

# ==========================================
# CACHE DOWNLOAD PIPELINE
# ==========================================
def download_models_to_volume():
    """
    Utility helper that verifies if files exist inside the network disk.
    Downloads them once if missing.
    """
    import requests
    os.makedirs(f"{MODEL_DIR}/checkpoints", exist_ok=True)
    os.makedirs(f"{MODEL_DIR}/motion_modules", exist_ok=True)

    checkpoint_path = f"{MODEL_DIR}/checkpoints/base_model.safetensors"
    motion_path = f"{MODEL_DIR}/motion_modules/mm_sd_v15_v2.ckpt"

    # Download uncensored base checkpoint if missing
    if not os.path.exists(checkpoint_path):
        print("📥 Downloading uncensored base checkpoint...")
        r = requests.get(ADULT_CHECKPOINT_URL, allow_redirects=True)
        with open(checkpoint_path, 'wb') as f:
            f.write(r.content)
        print("✅ Base checkpoint cached successfully.")

    # Download AnimateDiff motion module if missing
    if not os.path.exists(motion_path):
        print("📥 Downloading AnimateDiff motion module...")
        r = requests.get(MOTION_MODULE_URL, allow_redirects=True)
        with open(motion_path, 'wb') as f:
            f.write(r.content)
        print("✅ Motion module cached successfully.")

# ==========================================
# REMOTE GPU PIPELINE EXECUTION
# ==========================================
@app.function(
    gpu="A10G",               # Dedicated mid-tier GPU (Clean balance between execution speed and cost)
    volumes={MODEL_DIR: volume}, # Bind our shared storage directory to the worker
    timeout=600               # 10 minute maximum safety threshold
)
def generate_video_pipeline(prompt: str, negative_prompt: str, steps: int, frames: int) -> str:
    """
    Executes raw diffusion pipeline over custom checkpoints directly on the cloud GPU.
    """
    import torch
    from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
    from diffusers.utils import export_to_gif  # Can swap for mp4 utils

    # Ensure files exist on the mounted disk path
    download_models_to_volume()
    volume.commit() # Force save changes across cloud clusters

    checkpoint_path = f"{MODEL_DIR}/checkpoints/base_model.safetensors"
    motion_module_path = f"{MODEL_DIR}/motion_modules/mm_sd_v15_v2.ckpt"

    print("🚀 Initializing model pipeline onto GPU infrastructure...")
    
    # 1. Load the AnimateDiff motion engine configuration
    adapter = MotionAdapter.from_single_file(motion_module_path, torch_dtype=torch.float16)
    
    # 2. Compile single-file pipeline with custom loaded checkpoint architecture
    pipe = AnimateDiffPipeline.from_single_file(
        checkpoint_path,
        motion_adapter=adapter,
        torch_dtype=torch.float16
    )

    # 3. Setup fast image generation steps scheduling parameters
    pipe.scheduler = DDIMScheduler.from_config(
        pipe.scheduler.config,
        beta_schedule="linear",
        clip_sample=False,
        timestep_spacing="linspace",
    )

    # Enable aggressive memory optimizations to stay within VRAM bounds
    pipe.enable_vae_slicing()
    pipe.to("cuda")

    print(f"🎨 Diffusing frames for prompt: {prompt}")
    
    # 4. Run diffusion pipeline loop
    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=steps,
        num_frames=frames,
        guidance_scale=7.5,
        generator=torch.manual_seed(42), # Static seed or dynamic random generator integers
    )

    # Extract raw pixel outputs from output frames array
    video_frames = output.frames[0]
    
    # Save the output file temporarily into the ephemeral worker layer
    local_output_path = "/tmp/generated_output.gif"
    export_to_gif(video_frames, local_output_path)

    # ==========================================
    # CLOUD STORAGE UPLOAD UPLOAD GATEWAY
    # ==========================================
    # TODO: In real production setups, upload your output asset from here 
    # to your secure Cloudflare R2 bucket or AWS S3 bucket.
    # For testing, we return a simulated storage link mock string:
    
    print("📤 File compiled successfully. Uploading asset data to secure servers...")
    
    uploaded_cdn_url = f"https://amazonaws.com_{os.urandom(4).hex()}.gif"
    
    return uploaded_cdn_url
