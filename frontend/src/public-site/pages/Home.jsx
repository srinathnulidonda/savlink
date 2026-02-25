// frontend/src/public-site/pages/Home.jsx
import PublicLayout from '../layout/PublicLayout';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Testimonials from '../components/Testimonials';
import GetStarted from '../components/GetStarted';

export default function Home() {
  return (
    <PublicLayout>
      <Hero />
      <Features />
      <Testimonials />
      <GetStarted />
    </PublicLayout>
  );
}