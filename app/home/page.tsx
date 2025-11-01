"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    setRecommendations([
      { id: 1, name: "Local Park", distance: "1.2 km", image: "/park.jpg" },
      { id: 2, name: "Museum of Art", distance: "2.5 km", image: "/museum.jpg" },
      { id: 3, name: "Best Coffee", distance: "500 m", image: "/coffee.jpg" },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <input
        type="text"
        placeholder="Search destinations..."
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#16a085] mb-6"
      />

      <h2 className="text-xl font-semibold mb-4">Recommended Near You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((place) => (
          <div
            key={place.id}
            className="bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition"
          >
            <img
              src={place.image}
              alt={place.name}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg">{place.name}</h3>
              <p className="text-sm text-gray-500">{place.distance}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
