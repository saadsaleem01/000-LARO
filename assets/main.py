"""
FastAPI Service - Python Backend
Part of Win11 Development Environment
"""

import os
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://devuser:devpassword@localhost:5432/devdb")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://devuser:devpassword@localhost:27017/devdb?authSource=admin")
REDIS_URL = os.getenv("REDIS_URL", "redis://:devpassword@localhost:6379/0")

# Database connections
postgres_pool: Optional[asyncpg.Pool] = None
mongo_client: Optional[AsyncIOMotorClient] = None
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - connect/disconnect databases"""
    global postgres_pool, mongo_client, redis_client
    
    # Connect to databases
    try:
        postgres_pool = await asyncpg.create_pool(DATABASE_URL)
        print("✅ Connected to PostgreSQL")
    except Exception as e:
        print(f"⚠️ PostgreSQL connection failed: {e}")
    
    try:
        mongo_client = AsyncIOMotorClient(MONGODB_URL)
        await mongo_client.admin.command('ping')
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"⚠️ MongoDB connection failed: {e}")
    
    try:
        redis_client = redis.from_url(REDIS_URL)
        await redis_client.ping()
        print("✅ Connected to Redis")
    except Exception as e:
        print(f"⚠️ Redis connection failed: {e}")
    
    yield
    
    # Disconnect from databases
    if postgres_pool:
        await postgres_pool.close()
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="FastAPI Service",
    description="Python backend service for Win11 Dev Environment",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: str
    version: str
    databases: dict


class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    quantity: int = 0


class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    quantity: int
    created_at: str


# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "FastAPI Service",
        "message": "Welcome to the Python backend!",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with database status"""
    db_status = {
        "postgresql": "disconnected",
        "mongodb": "disconnected",
        "redis": "disconnected"
    }
    
    # Check PostgreSQL
    if postgres_pool:
        try:
            async with postgres_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_status["postgresql"] = "connected"
        except Exception:
            pass
    
    # Check MongoDB
    if mongo_client:
        try:
            await mongo_client.admin.command('ping')
            db_status["mongodb"] = "connected"
        except Exception:
            pass
    
    # Check Redis
    if redis_client:
        try:
            await redis_client.ping()
            db_status["redis"] = "connected"
        except Exception:
            pass
    
    return HealthResponse(
        service="fastapi",
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        databases=db_status
    )


@app.get("/api/items", response_model=List[ItemResponse])
async def get_items():
    """Get all items from PostgreSQL"""
    if not postgres_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    async with postgres_pool.acquire() as conn:
        # Create table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                quantity INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        rows = await conn.fetch("SELECT * FROM items ORDER BY id DESC")
        return [
            ItemResponse(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                price=float(row["price"]),
                quantity=row["quantity"],
                created_at=row["created_at"].isoformat()
            )
            for row in rows
        ]


@app.post("/api/items", response_model=ItemResponse)
async def create_item(item: Item):
    """Create a new item in PostgreSQL"""
    if not postgres_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    async with postgres_pool.acquire() as conn:
        # Create table if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                quantity INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        row = await conn.fetchrow(
            """
            INSERT INTO items (name, description, price, quantity)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            item.name, item.description, item.price, item.quantity
        )
        
        # Invalidate cache
        if redis_client:
            await redis_client.delete("items_cache")
        
        return ItemResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            price=float(row["price"]),
            quantity=row["quantity"],
            created_at=row["created_at"].isoformat()
        )


@app.get("/api/documents")
async def get_documents():
    """Get all documents from MongoDB"""
    if not mongo_client:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    db = mongo_client.devdb
    documents = await db.documents.find().to_list(100)
    
    # Convert ObjectId to string
    for doc in documents:
        doc["_id"] = str(doc["_id"])
    
    return {"documents": documents}


@app.post("/api/documents")
async def create_document(document: dict):
    """Create a new document in MongoDB"""
    if not mongo_client:
        raise HTTPException(status_code=503, detail="MongoDB not available")
    
    db = mongo_client.devdb
    document["created_at"] = datetime.utcnow().isoformat()
    result = await db.documents.insert_one(document)
    
    return {
        "id": str(result.inserted_id),
        "message": "Document created successfully"
    }


@app.get("/api/cache/{key}")
async def get_cache(key: str):
    """Get value from Redis cache"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")
    
    value = await redis_client.get(key)
    if value is None:
        raise HTTPException(status_code=404, detail="Key not found")
    
    return {"key": key, "value": value.decode()}


@app.post("/api/cache/{key}")
async def set_cache(key: str, value: str, ttl: int = 3600):
    """Set value in Redis cache"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")
    
    await redis_client.setex(key, ttl, value)
    return {"key": key, "value": value, "ttl": ttl}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
