from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {
        "message": "AI Companion backend is running 🚀"
    }