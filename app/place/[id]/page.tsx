"use client";

import { useParams, useRouter } from "next/navigation";

const places = {
  galleface: {
    name: "Galle Face Green",
    image:
      "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1a/4f/03/4e/galle-face-green.jpg",
    details:
      "Colombo’s iconic oceanfront park with wide open lawns, local street food stalls, and beautiful sunsets. It’s a favorite spot for evening walks and kite flying.",
  },
  gangaramaya: {
    name: "Gangaramaya Temple",
    image:
      "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Gangaramaya-Temple-3.jpg",
    details:
      "A famous Buddhist temple blending modern architecture with traditional design. It’s home to a museum, Bodhi tree, and serene lake views in the heart of Colombo.",
  },
  "lotus-tower": {
    name: "Lotus Tower",
    image:
      "https://www.sundayobserver.lk/sites/default/files/styles/large/public/news/2023/09/14/z_p01-The-Lotus-Tower.jpg",
    details:
      "Sri Lanka’s tallest tower and a symbol of modern Colombo. The Lotus Tower offers panoramic views, dining experiences, and light shows at night.",
  },

  gallefort: {
    name: "Galle Fort",
    image:
      "https://resources.travellocal.com/wp/uploads/2023/01/26120050/d2c54ee1-3c98-445d-b3c5-55eae274c55e-gallefort-galle-Srilanka-SS.jpeg-scaled.jpg",
    details:
      "A UNESCO World Heritage site built by the Portuguese and fortified by the Dutch. Explore charming streets, cafes, boutiques, and enjoy ocean sunsets from the ramparts.",
  },
  unawatuna: {
    name: "Unawatuna Beach",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-unawatuna-beach.jpg",
    details:
      "One of Sri Lanka’s most famous beaches with turquoise waters, coral reefs, and beach cafés. Perfect for swimming, diving, and relaxing.",
  },
  junglebeach: {
    name: "Jungle Beach",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-jungle-beach-galle.jpg",
    details:
      "A small hidden cove near Unawatuna, known for its calm clear water and excellent snorkeling opportunities.",
  },

  templeoftooth: {
    name: "Temple of the Tooth Relic",
    image:
      "https://nexttravelsrilanka.com/wp-content/uploads/2020/07/Temple-of-the-Tooth-Relic.jpg",
    details:
      "The sacred Temple of the Tooth Relic (Sri Dalada Maligawa) houses one of Buddhism’s most revered relics — the tooth of the Buddha — and is a cultural heart of Kandy.",
  },
  "kandy-lake": {
    name: "Kandy Lake",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-kandy-lake.jpg",
    details:
      "A tranquil lake built in 1807 by the last King of Kandy, surrounded by temples and shaded walking paths offering peaceful views of the city.",
  },
  peradeniya: {
    name: "Royal Botanical Gardens, Peradeniya",
    image:
      "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Royal-Botanical-Gardens-2.jpg",
    details:
      "Famous for its palm-lined avenues and 4,000+ plant species, this botanical garden is a must-visit for nature lovers.",
  },

  gregorylake: {
    name: "Gregory Lake",
    image:
      "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Lake-Gregory-2.jpg",
    details:
      "A picturesque lake surrounded by rolling hills and gardens in the heart of Nuwara Eliya. Visitors can enjoy boat rides, horse riding, and picnic spots.",
  },
  hakgalabotanical: {
    name: "Hakgala Botanical Garden",
    image:
      "https://nexttravelsrilanka.com/wp-content/uploads/2021/03/Hakgala-Botanical-Garden.jpg",
    details:
      "Located just outside Nuwara Eliya, this garden features exotic orchids, ferns, and cool-climate flowers among misty mountains.",
  },
  hortonplains: {
    name: "Horton Plains National Park",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-horton-plains-worlds-end.jpg",
    details:
      "A stunning plateau famous for World’s End cliff and scenic trails through grasslands, waterfalls, and forests.",
  },

  mirissa: {
    name: "Mirissa Beach",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-mirissa-beach-view.jpg",
    details:
      "A tropical paradise known for whale watching, palm-tree-lined beaches, and vibrant nightlife. Great for surfing and sunsets.",
  },
  polhena: {
    name: "Polhena Beach",
    image:
      "https://nexttravelsrilanka.com/wp-content/uploads/2021/07/Polhena-Beach-Matara.jpg",
    details:
      "A calm coral-protected beach ideal for snorkeling and swimming with turtles.",
  },

  sigiriya: {
    name: "Sigiriya Rock Fortress",
    image:
      "https://www.lovesrilanka.org/wp-content/uploads/2020/05/Sigiriya-2.jpg",
    details:
      "The ancient Lion Rock fortress built by King Kashyapa in the 5th century. It features frescoes, water gardens, and panoramic views from the summit.",
  },
  dambulla: {
    name: "Dambulla Cave Temple",
    image:
      "https://www.saltinourhair.com/wp-content/uploads/2018/08/sri-lanka-dambulla-cave-temple.jpg",
    details:
      "A UNESCO site with ancient murals and Buddha statues inside limestone caves dating back over 2,000 years.",
  },
};

export default function PlaceDetails() {
  const { id } = useParams();
  const router = useRouter();
  const place = places[id as keyof typeof places];

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <p>Place not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-[#16a085] font-medium mb-4 hover:underline"
        >
          ← Back
        </button>

        <div className="rounded-2xl overflow-hidden shadow-md mb-4 aspect-[16/9]">
          <img
            src={place.image}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl font-bold text-[#16a085] mb-3">
          {place.name}
        </h1>
        <p className="text-gray-800 leading-relaxed text-base">
          {place.details}
        </p>
      </div>
    </div>
  );
}
