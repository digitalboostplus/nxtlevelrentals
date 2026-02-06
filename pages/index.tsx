import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import TenantHero from '@/components/Landing/TenantHero';
import CityEventsSection from '@/components/Landing/CityEventsSection';
import WeatherAlertsSection from '@/components/Landing/WeatherAlertsSection';
import MaintenanceScheduleSection from '@/components/Landing/MaintenanceScheduleSection';
import TenantResourcesSection from '@/components/Landing/TenantResourcesSection';
import TenantCTASection from '@/components/Landing/TenantCTASection';

export default function HomePage() {
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
        <CityEventsSection />
        <WeatherAlertsSection />
        <MaintenanceScheduleSection />
        <TenantResourcesSection />
        <TenantCTASection />
      </main>
    </SiteLayout>
  );
}
