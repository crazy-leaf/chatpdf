from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
import uuid
from typing import Dict, List, Any
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain

from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate

from langchain.memory import ConversationBufferMemory

from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

sessions: Dict[str, Dict[str, Any]] = {}

class ChatMessage(BaseModel):
    session_id: str
    message: str

@app.get("/")
async def read_root():
    return {"message": "PDF Q&A Backend is running!"}

@app.post("/upload-pdf/{session_id}")
async def upload_pdf(session_id: str, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are allowed.")

    file_location = os.path.join(UPLOAD_DIR, f"{session_id}_{uuid.uuid4()}.pdf")
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        loader = PyPDFLoader(file_location)
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(documents)

        llm = Ollama(model="llama3", temperature=0)
        embeddings = OllamaEmbeddings(model="llama3")

        vectorstore = FAISS.from_documents(texts, embeddings)

        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        conversation_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever(),
            memory=memory
        )

        sessions[session_id] = {
            "doc_path": file_location,
            "vectorstore": vectorstore,
            "conversation_chain": conversation_chain,
            "chat_history": [],
            "summary_generated": False
        }

        summary_prompt_template = """Write a concise summary of the following document.

        "{text}"

        CONCISE SUMMARY:"""
        summary_prompt = PromptTemplate(template=summary_prompt_template, input_variables=["text"])

        summary_chain = load_summarize_chain(llm, chain_type="stuff", prompt=summary_prompt)

        
        
        summary_response = await summary_chain.ainvoke({"input_documents": documents})
        
        document_summary = summary_response["output_text"]
        
        sessions[session_id]["document_summary"] = document_summary
        sessions[session_id]["summary_generated"] = True

        return JSONResponse(status_code=200, content={"message": "PDF uploaded and processed successfully!", "session_id": session_id})

    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        print(f"WebSocket connected for session: {session_id}")

        if session_id in sessions and "document_summary" in sessions[session_id]:
            await self.send_personal_message('Hello! I\'ve processed your PDF. Here is a summary:', session_id)
            await self.send_personal_message(sessions[session_id]["document_summary"], session_id)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            print(f"WebSocket disconnected for session: {session_id}")

    async def send_personal_message(self, message: str, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = WebSocketManager()


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received message from session {session_id}: {data}")

            if session_id not in sessions:
                await manager.send_personal_message(
                    "Error: No document uploaded for this session. Please upload a PDF first.",
                    session_id
                )
                continue

            user_message = data
            session_data = sessions[session_id]
            conversation_chain = session_data["conversation_chain"]
            chat_history = session_data["chat_history"]

            chat_history.append({"role": "user", "content": user_message})

            try:
                response = await conversation_chain.ainvoke({"question": user_message})
                ai_answer = response["answer"]
            except Exception as e:
                ai_answer = f"Error getting AI response: {str(e)}. Please try again."

            chat_history.append({"role": "ai", "content": ai_answer})

            await manager.send_personal_message(ai_answer, session_id)

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        print(f"WebSocket error for session {session_id}: {e}")
        await manager.send_personal_message(f"An unexpected error occurred: {str(e)}", session_id)