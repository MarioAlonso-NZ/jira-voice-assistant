"use client";

import { useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function JiraRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isSent, setIsSent] = useState(false);

  const discardAudio = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setIsSent(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access is required to record tasks.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadToJira = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);

    try {
      // 1. Fetch the pre-signed URL
      const response = await fetch("https://bkwxeu6rqd.execute-api.us-east-2.amazonaws.com/default/jira-voice-presigned-url");
      const data = await response.json();

      if (!data.uploadURL) throw new Error("Failed to get pre-signed URL");

      // 2. Upload directly to S3
      const uploadResponse = await fetch(data.uploadURL, {
        method: "PUT",
        body: audioBlob,
        headers: { "Content-Type": "audio/webm" },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload audio to S3");

      // 3. Trigger Processor Lambda synchronously
      const processorUrl = "https://g3ns52m1lc.execute-api.us-east-2.amazonaws.com/default/jira-voice-processor";

      const s3Key = data.fileName || data.key || data.uploadURL.split('?')[0].split('/').pop();

      const lambdaResponse = await fetch(processorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3_key: s3Key })
      });

      const result = await lambdaResponse.json();

      if (lambdaResponse.ok) {
        setIsSent(true); // Lock the UI on success
        toast.success(
          <div>
            Audio pushed to Jira! <br />
            <a href={result.jira_url} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-800 hover:text-blue-900">
              View {result.issue_key}
            </a>
          </div>,
          { duration: 10000 }
        );
      } else {
        throw new Error(result.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during the upload process.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-slate-800 rounded-xl shadow-lg text-white">
      <Toaster position="top-center" reverseOrder={false} />
      <h2 className="text-2xl font-bold mb-4 text-center">Jira Voice Assistant</h2>

      <div className="flex flex-col items-center gap-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-xl font-bold transition-all disabled:opacity-50 ${isRecording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {isRecording ? "Stop" : "Record"}
        </button>

        {isRecording && <p className="text-red-400 font-medium">Listening to audio...</p>}

        {audioUrl && !isRecording && (
          <div className="w-full flex flex-col items-center gap-4 mt-4 animate-in fade-in zoom-in duration-300">
            <div className="flex w-full items-center gap-2">
              <audio src={audioUrl} controls className="w-full h-12 rounded-lg bg-slate-100" />
              <button
                onClick={discardAudio}
                disabled={isProcessing}
                title="Discard recording"
                className="p-3 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>

            <button
              onClick={uploadToJira}
              disabled={isProcessing || isSent}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center transition-all ${isSent
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-900/50"
                }`}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Ticket...
                </span>
              ) : isSent ? (
                "✓ Ticket Created"
              ) : (
                "Push to Jira"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}