"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState("Detecting...");
  const [places, setPlaces] = useState<any[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        const addr = data.address;

        const detectedDistrict =
          addr.district ||
          addr.county ||
          addr.state_district ||
          addr.state ||
          addr.city ||
          "Sri Lanka";

        setLocation(detectedDistrict);
        const district = detectedDistrict.toLowerCase();

        let nearby = [];

        if (district.includes("colombo")) {
          nearby = [
            {
              id: "galleface",
              name: "Galle Face Green",
              image:
                "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/4f/03/4e/galle-face-green.jpg",
              description:
                "Colombo’s iconic oceanfront park with sunsets and street food.",
            },
            {
              id: "gangaramaya",
              name: "Gangaramaya Temple",
              image:
                "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Gangaramaya-Temple-3.jpg",
              description:
                "A famous temple showcasing a mix of modern architecture and ancient tradition.",
            },
            {
              id: "lotus-tower",
              name: "Lotus Tower",
              image:
                "https://www.sundayobserver.lk/sites/default/files/styles/large/public/news/2023/09/14/z_p01-The-Lotus-Tower.jpg",
              description:
                "Sri Lanka’s tallest structure offering panoramic city views.",
            },
          ];
        } else if (district.includes("galle")) {
          nearby = [
            {
              id: "gallefort",
              name: "Galle Fort",
              image:
                "https://resources.travellocal.com/wp/uploads/2023/01/26120050/d2c54ee1-3c98-445d-b3c5-55eae274c55e-gallefort-galle-Srilanka-SS.jpeg-scaled.jpg",
              description:
                "A UNESCO World Heritage site filled with colonial charm and ocean views.",
            },
            {
              id: "unawatuna",
              name: "Unawatuna Beach",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-unawatuna-beach.jpg",
              description:
                "Golden-sand beach perfect for swimming, diving, and beach cafés.",
            },
            {
              id: "junglebeach",
              name: "Jungle Beach",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-jungle-beach-galle.jpg",
              description: "Hidden cove ideal for snorkeling and relaxing.",
            },
          ];
        } else if (district.includes("kandy")) {
          nearby = [
            {
              id: "templeoftooth",
              name: "Temple of the Tooth",
              image:
                "https://nexttravelsrilanka.com/wp-content/uploads/2020/07/Temple-of-the-Tooth-Relic.jpg",
              description:
                "Sacred Buddhist temple housing the relic of Lord Buddha’s tooth.",
            },
            {
              id: "kandy-lake",
              name: "Kandy Lake",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-kandy-lake.jpg",
              description:
                "Peaceful lake at the city’s heart surrounded by scenic views.",
            },
            {
              id: "peradeniya",
              name: "Royal Botanical Gardens",
              image:
                "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Royal-Botanical-Gardens-2.jpg",
              description:
                "Expansive gardens with orchids, palm avenues, and tropical flora.",
            },
          ];
        } else if (district.includes("nuwara") || district.includes("eliya")) {
          nearby = [
            {
              id: "gregorylake",
              name: "Gregory Lake",
              image:
                "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Lake-Gregory-2.jpg",
              description:
                "Beautiful lake surrounded by gardens, great for boat rides and photos.",
            },
            {
              id: "hakgalabotanical",
              name: "Hakgala Botanical Garden",
              image:
                "https://nexttravelsrilanka.com/wp-content/uploads/2021/03/Hakgala-Botanical-Garden.jpg",
              description:
                "Colorful garden with mountain views and rare floral species.",
            },
            {
              id: "hortonplains",
              name: "Horton Plains",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-horton-plains-worlds-end.jpg",
              description:
                "National park famous for World’s End cliff and scenic trails.",
            },
          ];
        } else if (district.includes("matara")) {
          nearby = [
            {
              id: "mirissa",
              name: "Mirissa Beach",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-mirissa-beach-view.jpg",
              description:
                "Tropical beach town known for whale watching and palm-tree viewpoints.",
            },
            {
              id: "polhena",
              name: "Polhena Beach",
              image:
                "https://nexttravelsrilanka.com/wp-content/uploads/2021/07/Polhena-Beach-Matara.jpg",
              description:
                "Coral reef-protected beach ideal for snorkeling and swimming.",
            },
          ];
        } else {
          nearby = [
            {
              id: "sigiriya",
              name: "Sigiriya Rock Fortress",
              image:
                "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Sigiriya-2.jpg",
              description:
                "Ancient rock fortress with royal gardens and breathtaking views.",
            },
            {
              id: "dambulla",
              name: "Dambulla Cave Temple",
              image:
                "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-dambulla-cave-temple.jpg",
              description:
                "Historic cave temple complex with colorful frescoes and Buddha statues.",
            },
          ];
        }

        setPlaces(nearby);
      },
      () => setLocation("Location unavailable")
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <h1 className="text-xl font-bold text-[#16a085] mb-2">
        Recommendations
      </h1>

      {places.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => router.push(`/place/${place.id}`)}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={place.image}
                  alt={place.name}
                  width={800}
                  height={450}
                  className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900">{place.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{place.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-10 text-center">
          Detecting nearby recommendations...
        </p>
      )}
    </div>
  );
}
