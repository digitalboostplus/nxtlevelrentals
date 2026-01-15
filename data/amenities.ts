export const propertyAmenities = [
  { id: 'pool', label: 'Pool' },
  { id: 'gym', label: 'Gym / Fitness Center' },
  { id: 'parking', label: 'Parking' },
  { id: 'laundry', label: 'In-Unit Laundry' },
  { id: 'dishwasher', label: 'Dishwasher' },
  { id: 'ac', label: 'Air Conditioning' },
  { id: 'heating', label: 'Heating' },
  { id: 'pet-friendly', label: 'Pet Friendly' },
  { id: 'balcony', label: 'Balcony / Patio' },
  { id: 'storage', label: 'Storage Unit' },
  { id: 'security', label: '24/7 Security' },
  { id: 'elevator', label: 'Elevator' },
] as const;

export type AmenityId = typeof propertyAmenities[number]['id'];
