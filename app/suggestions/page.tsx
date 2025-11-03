'use client'

import axios from 'axios'
import { useState } from 'react'

type Prediction = {
  placeId: string
  placeName: string
  predictedLevels: number[] 
  alternatives: { placeId: string; name: string; score: number }[]
}

export default function SuggestionsPage() {
  const [placeId, setPlaceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [pred, setPred] = useState<Prediction | null>(null)
  const [error, setError] = useState('')

  async function fetchPrediction() {
    setLoading(true)
    setError('')
    setPred(null)
    try {
      const res = await axios.get('/api/predict', { params: { placeId } })
      setPred(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Suggestions & Predictions</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          className="flex-1 p-2 border rounded-md"
          placeholder="Enter Google Place ID or name"
        />
        <button onClick={fetchPrediction} className="px-4 py-2 rounded-md bg-primary text-white">
          {loading ? 'Loading...' : 'Predict'}
        </button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {pred && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{pred.placeName}</h3>
            <p className="text-sm text-gray-600">Predicted crowd levels (next hours):</p>
            <div className="flex gap-2 mt-2">
              {pred.predictedLevels.map((v, i) => (
                <div key={i} className="bg-white p-2 rounded-md shadow-sm text-sm">
                  Hour +{i + 1}: <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Alternative places (less crowded)</h4>
            <ul className="mt-2 space-y-2">
              {pred.alternatives.map((a) => (
                <li key={a.placeId} className="p-3 bg-white rounded-md shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">score: {a.score}</div>
                  </div>
                  <a href={`/explore?place=${a.placeId}`} className="text-sm text-primary">View</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!pred && !loading && <p className="text-sm text-gray-500 mt-4">Enter a place ID or name to get predictions.</p>}
    </div>
  )
}
