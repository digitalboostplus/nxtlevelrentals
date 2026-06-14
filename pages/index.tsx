import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import SiteLayout from '@/components/Layout/SiteLayout';
import TenantHero from '@/components/Landing/TenantHero';
import CityEventsSection from '@/components/Landing/CityEventsSection';
import WeatherAlertsSection from '@/components/Landing/WeatherAlertsSection';
import MaintenanceScheduleSection from '@/components/Landing/MaintenanceScheduleSection';
import TenantResourcesSection from '@/components/Landing/TenantResourcesSection';
import TenantCTASection from '@/components/Landing/TenantCTASection';
import FeaturedPropertiesSection from '@/components/Landing/FeaturedPropertiesSection';
import type { LandingProperty } from '@/components/Landing/FeaturedPropertiesSection';

type HomePageProps = {
  properties: LandingProperty[];
};

export default function HomePage({ properties }: HomePageProps) {
  return (
    <SiteLayout>
      <Head>
        <title>Next Level Rentals - Tenant Experience Hub</title>
        <meta
          name="description"
          content="Explore upcoming events, weather notifications, and maintenance schedules curated for Next Level Rentals tenants. Log in to access your personalized resident portal."
        />
      </Head>
      <main>
        <TenantHero />
        <FeaturedPropertiesSection properties={properties} />
        <CityEventsSection />
        <WeatherAlertsSection />
        <MaintenanceScheduleSection />
        <TenantResourcesSection />
        <TenantCTASection />
      </main>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  // Fetch available properties server-side via the Admin SDK. If GHL hasn't been
  // synced or admin credentials are missing, fall back to an empty list so the
  // landing page still renders (the section hides itself when empty).
  let properties: LandingProperty[] = [];
  try {
    const { getPublicProperties } = await import('@/lib/properties-public');
    properties = await getPublicProperties();
  } catch (error) {
    console.error('Landing properties fetch failed:', error);
  }
  return { props: { properties } };
};
