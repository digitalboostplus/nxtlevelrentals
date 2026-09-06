// Single place for the facts the public landing page shows. Everything
// here is copy, not code: update it when a number, hour, or policy changes.
//
// Anything wrapped in [BRACKETS] is a placeholder the business still has to
// confirm. The UI hides a few of those lines when they are left blank.

export const company = {
  name: 'Next Level Rentals',
  city: 'Kansas City',
  state: 'MO',
  streetAddress: '6363 Rockhill Rd',
  postalCode: '64131',
  phoneDisplay: '(816) 666-7876',
  phoneTel: '+18166667876',
  email: 'info@nxtlevelmngmnt.com',
  // Leave blank until confirmed; the hero hides the line when empty.
  officeHours: '',
  // If there is a dedicated after-hours line, put it here. Falls back to the office number.
  emergencyPhoneDisplay: '',
  emergencyPhoneTel: '',
  // Plain-language service promise shown next to the maintenance form.
  repairWindow: 'within a few business days',
  // Flip on once a real payment processor is wired up. Until then the portal
  // shows payment instructions instead of a pay button.
  onlinePaymentsEnabled: false,
};

export function emergencyPhone() {
  return {
    display: company.emergencyPhoneDisplay || company.phoneDisplay,
    tel: company.emergencyPhoneTel || company.phoneTel,
  };
}

export const emergencyCriteria =
  'No heat in winter, no water, active flooding, sewage backup, gas smell, fire damage, or you are locked out.';

export type GuideEntry = {
  title: string;
  value?: string;
  tel?: string;
  href?: string;
  note: string;
};

export type GuideTab = {
  id: 'contacts' | 'utilities' | 'neighborhood' | 'weather';
  label: string;
  entries: GuideEntry[];
};

// Public numbers for Kansas City, MO. Confirm before launch; utilities change them occasionally.
export const localGuide: GuideTab[] = [
  {
    id: 'contacts',
    label: 'Who to call',
    entries: [
      {
        title: 'After-hours maintenance',
        value: emergencyPhone().display,
        tel: emergencyPhone().tel,
        note: 'Next Level Rentals. Call or text, any hour, for the emergencies listed above.',
      },
      {
        title: 'Gas leak or smell',
        value: '(800) 582-1234',
        tel: '+18005821234',
        note: 'Spire emergency line. Leave the house first, then call from outside.',
      },
      {
        title: 'Power outage',
        value: '(888) 544-4852',
        tel: '+18885444852',
        href: 'https://www.evergy.com/outages',
        note: 'Evergy. Check their outage map before calling; most outages are already reported.',
      },
      {
        title: 'No water or water main',
        value: '(816) 513-0567',
        tel: '+18165130567',
        note: 'KC Water 24-hour line. Then let us know so we can check the house.',
      },
      {
        title: 'Police, non-emergency',
        value: '(816) 234-5111',
        tel: '+18162345111',
        note: 'KCPD. Noise, suspicious activity, or a break-in you discovered after the fact.',
      },
      {
        title: 'City services (311)',
        value: '(816) 513-1313',
        tel: '+18165131313',
        note: 'Missed trash pickup, potholes, streetlights, bulky item pickup.',
      },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities and move-in',
    entries: [
      {
        title: 'Electric',
        value: 'Evergy',
        href: 'https://www.evergy.com',
        note: 'Put service in your name before move-in day so the power is on when you arrive.',
      },
      {
        title: 'Natural gas',
        value: 'Spire',
        href: 'https://www.spireenergy.com',
        note: 'Needed for heat and hot water in most of our homes. Start service a few days ahead.',
      },
      {
        title: 'Water and sewer',
        value: 'KC Water',
        href: 'https://www.kcwater.us',
        note: 'Check your lease: water is either in your name or billed back with rent.',
      },
      {
        title: 'Trash and recycling',
        value: 'City of Kansas City',
        href: 'https://www.kcmo.gov/city-hall/departments/public-works/solid-waste',
        note: 'Weekly pickup. Look up your day by address on the city site and set carts out the night before.',
      },
      {
        title: 'Internet',
        value: 'Google Fiber, Spectrum, AT&T',
        note: 'Availability varies by street. Check each provider by address before you order.',
      },
      {
        title: 'Move-in checklist',
        note: 'Forward your mail with USPS, take photos of every room on day one, find the water shutoff and breaker box, and consider renters insurance.',
      },
    ],
  },
  {
    id: 'neighborhood',
    label: 'Around the neighborhood',
    entries: [
      {
        title: 'Groceries',
        value: 'Price Chopper, Hy-Vee, Aldi',
        note: 'All have several Kansas City locations. Most offer pickup and delivery.',
      },
      {
        title: 'Pharmacy',
        value: 'CVS, Walgreens',
        note: 'Many locations are open late. Independent pharmacies often fill faster.',
      },
      {
        title: 'Parks and trails',
        value: 'Swope Park, Loose Park, Brush Creek Trail',
        note: 'Swope Park is one of the largest city parks in the country and has the zoo.',
      },
      {
        title: 'Getting around',
        value: 'RideKC buses, KC Streetcar',
        href: 'https://ridekc.org',
        note: 'The streetcar runs from the River Market through downtown to the Plaza and UMKC.',
      },
      {
        title: 'Schools',
        value: 'Depends on your address',
        href: 'https://dese.mo.gov',
        note: 'Kansas City has several districts. Use the state school locator with your street address.',
      },
      {
        title: 'Driver license and plates',
        value: 'Missouri license office',
        href: 'https://dor.mo.gov/license-office-locator/',
        note: 'New to Missouri? You have 30 days to transfer your license and register your car.',
      },
    ],
  },
  {
    id: 'weather',
    label: 'Weather and seasons',
    entries: [
      {
        title: 'Hard freeze',
        note: 'Keep heat at 55 or above even when away, let faucets drip on outside walls, and open cabinet doors under sinks.',
      },
      {
        title: 'Tornado warning',
        note: 'Sirens mean take shelter now: basement, or the lowest interior room with no windows. Keep shoes and a flashlight nearby in spring.',
      },
      {
        title: 'Severe storms',
        note: 'Report downed lines to Evergy, never touch them. Text us photos of any roof, window, or tree damage the same day.',
      },
      {
        title: 'Summer heat',
        note: 'Change the HVAC filter monthly in summer. If the AC stops cooling, turn it off and text us; running it can damage the unit.',
      },
      {
        title: 'Snow and ice',
        note: 'Your lease says who clears the walk and drive. When in doubt, text us before the storm and we will confirm.',
      },
      {
        title: 'Fall checklist',
        note: 'Disconnect hoses before the first freeze, replace the furnace filter, and let us know if the furnace has not been on yet by November.',
      },
    ],
  },
];

export type FaqItem = { question: string; answer: string };

export const faq: FaqItem[] = [
  {
    question: 'When is rent due, and is there a grace period?',
    answer:
      'Your due date, grace period, and any late fee are on the first page of your lease. Not sure? Text us and we will check. Autopay in the portal is the easiest way to never think about it.',
  },
  {
    question: 'How do I pay rent online?',
    answer:
      'Sign in to the tenant portal and choose Pay rent. You can pay by card or bank transfer, and set up autopay so it happens on its own each month.',
  },
  {
    question: 'What counts as an emergency repair?',
    answer: `${emergencyCriteria} For any of those, call us at ${emergencyPhone().display} instead of using the form. Fire, medical, or a crime in progress: call 911 first.`,
  },
  {
    question: 'Who handles the yard, gutters, and snow?',
    answer:
      'It depends on the home and is spelled out in your lease. We handle gutters and anything that needs a ladder. If your lease is unclear, ask us and we will put the answer in writing.',
  },
  {
    question: 'How do I give notice or renew my lease?',
    answer:
      'Your lease lists the notice period, usually in writing before your lease ends. We reach out ahead of your end date with renewal terms, and you can always text us to start the conversation early.',
  },
  {
    question: 'Can I get a copy of my lease?',
    answer:
      'Yes. Signed leases and any addendums are in the Documents section of the tenant portal. If you do not see yours, email us and we will send it the same day.',
  },
];

export const maintenanceCategories = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Appliance',
  'Safety',
  'Structural',
  'Other',
] as const;

export type PublicMaintenanceCategory = (typeof maintenanceCategories)[number];
export const maintenancePriorities = ['Low', 'Medium', 'High'] as const;
export type PublicMaintenancePriority = (typeof maintenancePriorities)[number];
