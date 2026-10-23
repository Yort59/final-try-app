import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# Enable CORS so your Vite frontend (localhost:5173) can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HTTP Endpoints (Matching your frontend proxy routes) ---

@app.get("/api/coinbase/products")
async def get_products():
    # Fetch real products from Coinbase Public API or return mock data
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.exchange.coinbase.com/products")
        return response.json()

@app.get("/api/coinbase/ticker/{product_id}")
async def get_ticker(product_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.exchange.coinbase.com/products/{product_id}/ticker")
        return response.json()

@app.get("/api/coinbase/accounts")
async def get_accounts(mode: str = "Live"):
    # Placeholder for Live trading vs live account data
    return {
        "mode": mode,
        "accounts": [
           # {"currency": "USD", "balance": "10.00", "available": "10.00"},
           # {"currency": "BTC", "balance": "0.50", "available": "0.50"}
        ]
    }

# --- WebSocket Endpoint for Real-Time Streaming ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Frontend WebSocket connected!")
    try:
        while True:
            # Simulate streaming live crypto price updates to the frontend every second
            mock_data = {
                "type": "ticker",
                "product_id": "BTC-USD",
                "price": "67250.00", # Replace with real Coinbase WS feed logic if needed
                "time": asyncio.get_event_loop().time()
            }
            await websocket.send_text(json.dumps(mock_data))
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        print("Frontend WebSocket disconnected.")

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000 (or whichever port your frontend expects)
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)