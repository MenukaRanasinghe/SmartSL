'use client'

import { useState } from 'react'

export default function ExplorePage() {
  const [query, setQuery] = useState('')

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Explore</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-2 border rounded-md"
          placeholder="Search places (e.g., Colombo Fort, Galle Fort)"
        />
        <button className="px-4 py-2 rounded-md bg-primary text-white">Search</button>
      </div>

      <p className="text-sm text-gray-500">Map + place results will appear here (connect Google Maps / Places API).</p>
    </div>
  )
}
