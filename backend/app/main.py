from fastapi import FastAPI

app = FastAPI()



@app.get("/person")
async def root():
    return {"message": "Hello World"}