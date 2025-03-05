from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):
    messages: list[dict]

@app.post("/chat1")
async def chat1(request: ChatRequest):
    try:
        # ... existing code ...
        
        response = await client.chat.completions.create(
            model="claude-3-sonnet",
            messages=messages
        )
        
        assistant_message = response.choices[0].message.content
        
        # 只保留一条日志，记录生成的响应
        logger.info(f"Chat response: {assistant_message}")
        
        return {"response": assistant_message}
        
    except Exception as e:
        logger.error(f"Error in chat1: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 