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

export default function LandingPage() {
	return (
		<main className="landing-page bg-background text-foreground">
			<LpHeader />
			<div className="pt-16">
				<HeroSection />
				<FeaturesSection />
				<div className="h-[50vh] flex items-center justify-center mb-12">
					<div className="text-center">
						<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">ラインナップ</h2>
						<p className="text-lg text-muted-foreground mx-auto w-full">
							様々なジャンルから選べる人気タイトルをご用意しています
						</p>
					</div>
				</div>
				<GamesSection />
				<StepsSection />

				{/* スペック紹介セクション */}
				<SpecsSection />

				{/* 予約カレンダーセクション (新規追加) */}
				<AvailabilitySection />

				{/* よくある質問セクション */}
				<FaqSection />

				{/* アクセス・料金セクション */}
				<AccessSection />

				{/* 最終CTAセクション */}
				<CtaSection />
			</div>

			{/* LP専用フッター */}
			<LpFooter />
		</main>
	);
}