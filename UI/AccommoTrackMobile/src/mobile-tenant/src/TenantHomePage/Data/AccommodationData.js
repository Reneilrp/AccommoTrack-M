import R103 from '../../../../../assets/103.jpeg';
import AlexA from '../../../../../assets/ImageDetails.jpeg';
import KV from '../../../../../assets/KV.jpeg';
import CHD from '../../../../../assets/CHD.jpeg';
import R101 from '../../../../../assets/101.jpeg';
import MLS from '../../../../../assets/MLS.jpeg';
import BFD from '../../../../../assets/BFD.jpeg';
import ASH from '../../../../../assets/ASH.jpeg';

export const featuredAccommodation = [
  {
    id: 1,
    name: "Q&M Dormitory",
    type: "Dormitory",
    image: R103,
    rating: 4.8,
    reviews: 124,
    price: 5000,
    location: "Amethyst St. San JoseCawa-cawa, Zamboanga City",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: false
  },
  {
    id: 2,
    name: "Alex Apartment",
    type: "Apartment",
    image: AlexA,
    rating: 4.9,
    reviews: 98,
    price: 6500,
    location: "Canelar Moret, Zamboanga City",
    amenities: ["WiFi", "Parking", "AC"],
    liked: false
  },
  {
    id: 4,
    name: "Kuya Vince Boarding House",
    type: "Boarding House",
    image: KV,
    rating: 5.0,
    reviews: 89,
    price: 7000,
    location: "Baliwasan Rd, Zamboanga City",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: false
  },
];

export const bestRatingAccommodation = [
  {
    id: 4,
    name: "Kuya Vince Boarding House",
    type: "Boarding House",
    image: KV,
    rating: 5.0,
    reviews: 89,
    price: 7000,
    location: "Baliwasan Rd, Zamboanga City",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: false
  },
  {
    id: 1,
    name: "Q&M Dormitory",
    type: "Dormitory",
    image: R103,
    rating: 4.8,
    reviews: 124,
    price: 5000,
    location: "Amethyst St. San JoseCawa-cawa, Zamboanga City",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: false
  },
  {
    id: 5,
    name: "Cozy Haven Dorm",
    type: "Dormitory",
    image: CHD,
    rating: 4.9,
    reviews: 145,
    price: 5500,
    location: "Pasig, Philippines",
    amenities: ["WiFi", "AC"],
    liked: false
  }
];

export const bestAmenitiesAccommodation = [
  {
    id: 6,
    name: "Luxury Student Suites",
    type: "Apartment",
    image: R101,
    rating: 4.8,
    reviews: 76,
    price: 8000,
    location: "Ortigas, Philippines",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: false
  },
  {
    id: 7,
    name: "Modern Living Spaces",
    type: "Boarding House",
    image: MLS,
    rating: 4.7,
    reviews: 92,
    price: 6000,
    location: "Manila, Philippines",
    amenities: ["WiFi", "Parking", "Kitchen", "AC"],
    liked: true
  }
];

export const lowPriceAccommodation = [
  {
    id: 8,
    name: "Budget Friendly Dorm",
    type: "Bed Spacer",
    image: BFD,
    rating: 4.5,
    reviews: 134,
    price: 3000,
    location: "Mandaluyong, Philippines",
    amenities: ["WiFi", "Kitchen"],
    liked: false
  },
  {
    id: 9,
    name: "Affordable Student House",
    type: "Bed Spacer",
    image: ASH,
    rating: 4.4,
    reviews: 167,
    price: 3500,
    location: "Taguig, Philippines",
    amenities: ["WiFi", "AC"],
    liked: false
  }
];