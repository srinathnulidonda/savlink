// src/pages/public/Home.jsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import HomeNavbar from '../../components/home/home-navbar';
import HomeFooter from '../../components/home/home-footer';
import HeroSection from '../../components/home/HeroSection';
import Features from '../../components/home/Features';
import HowItWorks from '../../components/home/HowItWorks';
import TestimonialsSection from '../../components/home/TestimonialsSection';
import CTASection from '../../components/home/CTASection';

export default function Home() {
    return (
        <div className="min-h-screen bg-black overflow-x-hidden">
            <HomeNavbar />
            <main className="overflow-x-hidden">
                <HeroSection />
                <Features />
                <HowItWorks />
                <TestimonialsSection />
                <CTASection />
            </main>
            <HomeFooter />
        </div>
    );
}