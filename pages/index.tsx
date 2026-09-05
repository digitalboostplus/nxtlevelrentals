import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import SiteLayout from '@/components/Layout/SiteLayout';
import HomeHero from '@/components/Landing/HomeHero';
import MaintenanceRequestSection from '@/components/Landing/MaintenanceRequestSection';
import LocalGuideSection from '@/components/Landing/LocalGuideSection';
import FeaturedPropertiesSection from '@/components/Landing/FeaturedPropertiesSection';
import AboutFaqSection from '@/components/Landing/AboutFaqSection';
import type { LandingProperty } from '@/components/Landing/FeaturedPropertiesSection';
import { company } from '@/data/site';

type HomePageProps = {
  properties: LandingProperty[];
};

export default function HomePage({ properties }: HomePageProps) {
  const title = `${company.name} | ${company.city} rental homes, repairs, and resident guide`;
  const description = `Pay rent, request a repair without logging in, and find ${company.city} utility and emergency numbers. Owner-operated rental homes managed by ${company.name}.`;

  return (
    <SiteLayout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: company.name,
              telephone: company.phoneTel,
              email: company.email,
              address: {
                '@type': 'PostalAddress',
                streetAddress: company.streetAddress,
                addressLocality: company.city,
                addressRegion: company.state,
                postalCode: company.postalCode,
                addressCountry: 'US',
              },
              areaServed: `${company.city}, ${company.state}`,
            }),
          }}
        />
      </Head>
      <HomeHero />
      <MaintenanceRequestSection />
      <LocalGuideSection />
      <FeaturedPropertiesSection properties={properties} />
      <AboutFaqSection />
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
