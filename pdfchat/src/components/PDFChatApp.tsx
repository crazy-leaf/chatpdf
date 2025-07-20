import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, MessageCircle, FileText, Send, Bot, User, Loader2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '../hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const PDFChatApp = () => {
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const connectWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebsocket(ws);
    };

    ws.onmessage = (event) => {
      setIsAiTyping(false);
      addMessage('ai', event.data);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsAiTyping(false);
      if (isUploaded) {
        addMessage('ai', 'Connection lost. Please refresh the page to reconnect.');
      }
      setWebsocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsAiTyping(false);
      addMessage('ai', 'Connection error occurred. Please try again.');
    };
  };

  const addMessage = (type: 'user' | 'ai', content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading and processing PDF...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`http://localhost:8000/upload-pdf/${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus(`PDF uploaded successfully! ${result.message || ''}`);
        setIsUploaded(true);
        setIsAiTyping(true);
        connectWebSocket();
        toast({
          title: "Success",
          description: "PDF uploaded and processed successfully!",
        });
      } else {
        const error = await response.json();
        setUploadStatus(`Upload failed: ${error.detail || 'Unknown error'}`);
        toast({
          title: "Upload failed",
          description: error.detail || "Unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Network error occurred. Please try again.');
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) return;

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Not connected",
        description: "Chat is not connected. Please try uploading the PDF again.",
        variant: "destructive",
      });
      return;
    }

    addMessage('user', trimmedMessage);
    setIsAiTyping(true);
    websocket.send(trimmedMessage);
    setInputMessage('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRemoveDocument = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.close();
    }
    setWebsocket(null);

    setIsUploaded(false);
    setSelectedFile(null);
    setMessages([]);
    setInputMessage('');
    setIsAiTyping(false);
    setUploadStatus('');
    setSessionId(uuidv4());

    toast({
      title: "Document Removed",
      description: "You can now upload a new PDF.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full shadow-elegant">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Chat with PDF
            </h1>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload PDF Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Upload PDF Document</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your PDF file here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">Maximum file size: 10MB</p>
                </div>
                
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="pdf-upload-input"
                    key={selectedFile?.name || ''}
                  />
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isUploaded}
                  >
                    Select PDF File
                  </Button>
                  
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      Selected: {selectedFile.name}
                      {!isUploaded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1 h-auto"
                        >
                          <XCircle className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <Button
                    variant="upload"
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isUploading || isUploaded}
                    className="w-full sm:w-auto"
                    id="upload-button"
                  >
                    {isUploading ? 'Processing...' : 'Upload & Process'}
                  </Button>
                </div>
              </div>
            </div>
            
            <div id="upload-status" className="text-sm text-muted-foreground">
              {uploadStatus}
            </div>
          </CardContent>
        </Card>

        {isUploaded && (
          <Card className="shadow-card" id="chat-section">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Chat
              </CardTitle>
              <Button
                variant="ghost"
                          size="sm"
                onClick={handleRemoveDocument}
                className="flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Remove Document
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={chatWindowRef}
                id="chat-window"
                className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/30"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type === 'ai' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-card text-card-foreground border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isAiTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="max-w-[80%] p-3 rounded-lg bg-card text-card-foreground border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">AI is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  id="user-input"
                  placeholder="Ask a question about the PDF..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isAiTyping}
                />
                <Button
                  id="send-button"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || !websocket || isAiTyping}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isUploaded && (
          <Card className="shadow-card border-dashed">
            <CardContent className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Chat!</h3>
              <p className="text-muted-foreground">
                Upload a PDF document above to start asking questions about its content.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};