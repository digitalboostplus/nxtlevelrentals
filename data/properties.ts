export type Property = {
  id: string;
  name: string;
  location: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  price: string;
  description: string;
};

export const featuredProperties: Property[] = [
  {
    id: 'skyline-lofts',
    name: 'Skyline Lofts',
    location: 'Uptown District, Cityville',
    image:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
    bedrooms: 2,
    bathrooms: 2,
    price: '$2,150/mo',
    description:
      'Floor-to-ceiling windows with panoramic skyline views, designer finishes, and smart home controls throughout.'
  },
  {
    id: 'lakeside-residences',
    name: 'Lakeside Residences',
    location: 'Harbor Front, Seaport City',
    image:
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
    bedrooms: 3,
    bathrooms: 2,
    price: '$2,850/mo',
    description:
      'Resort-style amenities with lakeside jogging trails, outdoor lounge spaces, and EV charging stations.'
  },
  {
    id: 'midtown-haven',
    name: 'Midtown Haven',
    location: 'Midtown East, Cityville',
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    bedrooms: 1,
    bathrooms: 1,
    price: '$1,650/mo',
    description:
      'Boutique building with concierge services, co-working lounges, and curated community events every week.'
  }
];

export type ServiceCategory = {
  title: string;
  description: string;
  features: string[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    title: 'Property Marketing',
    description: 'Data-driven marketing campaigns to attract high-quality tenants quickly.',
    features: [
      'Professional photography and virtual tours',
      'Listing syndication across 25+ platforms',
      'Dynamic pricing based on market data',
      'Owner dashboards with real-time analytics'
    ]
  },
  {
    title: 'Tenant Care & Retention',
    description: 'End-to-end tenant lifecycle management that keeps residents engaged and informed.',
    features: [
      'Onboarding concierge and digital lease signing',
      'Automated rent reminders and autopay options',
      'Responsive in-app messaging with managers',
      'Community events and loyalty rewards program'
    ]
  },
  {
    title: 'Property Operations',
    description: 'Modern maintenance workflows with trusted vendor networks and transparent reporting.',
    features: [
      '24/7 maintenance coordination and triage',
      'Photo and video documentation stored securely',
      'Performance tracking for vendors and SLAs',
      'Compliance monitoring and inspection scheduling'
    ]
  }
];

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

export const testimonials: Testimonial[] = [
  {
    name: 'Angela Martin',
    role: 'Tenant · Lakeside Residences',
    quote:
      'The tenant portal makes everything effortless—from paying rent to scheduling repairs. Maintenance requests get responses within hours.'
  },
  {
    name: 'Jason Patel',
    role: 'Property Owner · Skyline Lofts',
    quote:
      'Next Level Rentals transformed our portfolio management. I have visibility into financials, occupancy, and maintenance from anywhere.'
  },
  {
    name: 'Riley Thompson',
    role: 'Tenant · Midtown Haven',
    quote:
      'I love the transparency. I can see every document, message, and update in one place. The mobile experience is top notch.'
  }
];
