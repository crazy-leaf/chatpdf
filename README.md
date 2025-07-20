# Chat With PDF

A web application that lets you chat with your PDF documents using a local AI model (Llama3) powered by Ollama. Get instant answers and summaries from your documents!

## Features

* **PDF Upload:** Easily upload your PDF files.
* **Intelligent Q&A:** Ask questions about your document's content and get accurate answers.
* **Local AI:** Uses Llama3 via Ollama, ensuring your data stays private and runs on your machine.
* **Auto-Summary:** Get a quick summary of your PDF right after it's processed.
* **Real-time Chat:** Smooth, responsive chat experience with AI typing indicators.
* **Clear Session:** Remove the current document and chat history to start fresh.

## Screenshots

Here's a look at the Chat with PDF in action:

![Chat with PDF Main Screen 1](https://github.com/crazy-leaf/chatpdf/blob/main/screenshots/Screenshot%202025-07-20%20at%209.44.08%E2%80%AFPM.png)

![Chat with PDF Main Screen 2](https://github.com/crazy-leaf/chatpdf/blob/main/screenshots/Screenshot%202025-07-20%20at%209.47.26%E2%80%AFPM.png)

![Chat with PDF Main Screen 3](https://github.com/crazy-leaf/chatpdf/blob/main/screenshots/Screenshot%202025-07-20%20at%209.50.53%E2%80%AFPM.png)

![Chat with PDF Main Screen 3](https://github.com/crazy-leaf/chatpdf/blob/main/screenshots/Screenshot%202025-07-20%20at%209.52.17%E2%80%AFPM.png)

## Tech Stack

* **Frontend:** React.js, TypeScript, Shadcn/ui, Vite
* **Backend:** FastAPI (Python), LangChain
* **Local LLM:** Llama3 (served by Ollama)
* **Database:** In-memory (FAISS for vector store)
* **Communication:** WebSockets

## Prerequisites

Make sure you have these installed:

* [Node.js](https://nodejs.org/en/download/) (LTS) & npm
* [Python 3.9+](https://www.python.org/downloads/) & pip
* [Ollama](https://ollama.com/download)

## Setup & Run Locally

Follow these steps to get the app running on your machine.

### 1. Install Ollama & Download Llama3

1.  Download and install Ollama from [ollama.com/download](https://ollama.com/download).
2.  Open your terminal and download the Llama3 model:
    ```bash
    ollama run llama3
    ```
    *(Exit the chat interface after download: `bye` or `Ctrl+C`)*
3.  Verify Ollama is running: Open `http://localhost:11434` in your browser.

### 2. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python3 -m venv venv
    # macOS/Linux: source venv/bin/activate
    # Windows: .\venv\Scripts\activate
    ```
3.  Install dependencies (including WebSocket support):
    ```bash
    pip install -r requirements.txt
    pip install 'uvicorn[standard]'
    ```
    *(Create an empty `.env` file in this directory if one doesn't exist.)*

### 3. Frontend Setup

1.  Navigate to the `pdfchat` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### 4. Run the Application

Open **three separate terminal windows**.

1.  **Terminal 1 (Ollama):** Ensure Ollama is serving:
    ```bash
    ollama serve
    ```
    *(This usually runs in the background after `ollama run`)*
2.  **Terminal 2 (Backend):** Navigate to `backend` and run:
    ```bash
    cd backend
    uvicorn main:app --reload
    ```
3.  **Terminal 3 (Frontend):** Navigate to `frontend` and run:
    ```bash
    cd pdfchat
    npm run dev
    ```

Your browser should automatically open to `http://localhost:5173` (or similar).

## How to Use

1.  **Upload:** Drag a PDF onto the upload area or click "Select PDF File."
2.  **Process:** Click "Upload & Process." The AI will then provide an automatic summary.
3.  **Chat:** Ask questions about your PDF in the chat box.
4.  **Clear:** Click "Remove Document" to upload a new PDF.

## Future Enhancements

* **Multi-PDF Support:** Query across multiple documents.
* **Dockerization:** Easier deployment with Docker.