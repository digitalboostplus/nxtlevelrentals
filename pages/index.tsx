import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import HeroSection from '@/components/Landing/HeroSection';
import ServicesSection from '@/components/Landing/ServicesSection';
import PropertiesSection from '@/components/Landing/PropertiesSection';
import TestimonialsSection from '@/components/Landing/TestimonialsSection';
import CTASection from '@/components/Landing/CTASection';

export default function HomePage() {
  return (
    <SiteLayout>
      <Head>
        <title>Next Level Rentals · Property Management Tenant Portal</title>
        <meta
          name="description"
          content="A modern tenant portal and landing page for property management teams with Firebase-powered workflows and secure rent collection."
        />
      </Head>
      <HeroSection />
      <ServicesSection />
      <PropertiesSection />
      <TestimonialsSection />
      <CTASection />
    </SiteLayout>
  );
}
