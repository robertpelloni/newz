"use client";

import { useEffect, useState } from "react";

interface Topic {
  id: number;
  title: string;
  summary: string;
  category: string;
}

interface GlobalSentiment {
  overall_sentiment: number;
  recent_entries: number;
}

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sentiment, setSentiment] = useState<GlobalSentiment | null>(null);

  useEffect(() => {
    // Fetch topics
    fetch("http://localhost:8000/api/topics")
      .then((res) => res.json())
      .then((data) => setTopics(data))
      .catch((err) => console.error(err));

    // Fetch global sentiment
    fetch("http://localhost:8000/api/sentiment/global")
      .then((res) => res.json())
      .then((data) => setSentiment(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="flex min-h-screen flex-col p-8 bg-gray-100">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Omnifeed Dashboard</h1>
        <div className="text-sm font-medium text-gray-500">Live API Enabled</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* Main News Feed Column */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Breaking Topics</h2>

          {topics.length === 0 ? (
            <p className="text-gray-500">Loading topics...</p>
          ) : (
            topics.map(topic => (
              <div key={topic.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer">{topic.title}</h3>
                  {topic.category && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase">{topic.category}</span>}
                </div>
                <p className="text-gray-600 mb-4">{topic.summary || "No summary available."}</p>
              </div>
            ))
          )}
        </div>

        {/* Sentiment & Social Column */}
        <div className="col-span-1 lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Social Pulse</h2>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-bold text-gray-800 mb-3">Global Sentiment</h4>
            {sentiment ? (
               <div className="text-center">
                 <div className="text-4xl font-bold">{(sentiment.overall_sentiment * 100).toFixed(0)}%</div>
                 <div className="text-sm text-gray-500">Based on {sentiment.recent_entries} recent entries</div>
               </div>
            ) : (
              <p className="text-gray-500">Loading sentiment...</p>
            )}
          </div>
        </div>

        {/* Media Bias / Source View Column */}
        <div className="col-span-1 lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Source Insights</h2>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-bold text-gray-800 mb-3">Coverage Density</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Google News</span>
                <span className="font-medium bg-gray-100 px-2 py-1 rounded">Syncing...</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
