"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function GenerateContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const id = searchParams.get("id");
    const filename = searchParams.get("filename");
    
    if (id && filename) {
      setMessage(`Processing: ${filename}`);
    } else {
      setMessage("Invalid request");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090f] text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Generating Clip</h1>
        <p className="text-xl text-white/70">{message}</p>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#07090f] text-white">Loading...</div>}>
      <GenerateContent />
    </Suspense>
  );
}
