'use client';

import HeroSection from '@/components/lp/hero-section';
import FeaturesSection from '@/components/lp/features-section';
import GamesSection from '@/components/lp/games-section';
import StepsSection from '@/components/lp/steps-section';
import SpecsSection from '@/components/lp/specs-section';
import AvailabilitySection from '@/components/lp/availability-section';
import FaqSection from '@/components/lp/faq-section';
import AccessSection from '@/components/lp/access-section';
import CtaSection from '@/components/lp/cta-section';
import LpHeader from '@/components/lp/lp-header';
import LpFooter from '@/components/lp/lp-footer';
import SeatInitializer from '@/components/ini/create-seat-documents';

export default function LandingPage() {
	return (
		<main className="landing-page text-foreground">
			<LpHeader />
			<div className="pt-16">
				<HeroSection/>
				<FeaturesSection/>
				<GamesSection/>
				<StepsSection/>
				<SpecsSection />
				<AvailabilitySection />
				<FaqSection />
				<AccessSection />
				<CtaSection />
			</div>
			<LpFooter />
		</main>
	);
}