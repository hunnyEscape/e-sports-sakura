import HeroSection from '@/components/lp/hero-section';
import FeaturesSection from '@/components/lp/features-section';
import GamesSection from '@/components/lp/games-section';
import StepsSection from '@/components/lp/steps-section';
import SpecsSection from '@/components/lp/specs-section';
import FaqSection from '@/components/lp/faq-section';
import AccessSection from '@/components/lp/access-section';
import CtaSection from '@/components/lp/cta-section';
import LpHeader from '@/components/lp/lp-header';
import LpFooter from '@/components/lp/lp-footer';

// メタデータ設定
export const metadata = {
	title: '遊び足りない夜の、秘密基地 | E-Sports Sakura',
	description: 'RTX 4070搭載のゲーミングPC、無料ドリンク、24時間無人運営。サシ飲み後やひとりの夜に立ち寄れる秘密基地。',
};

export default function LandingPage() {
	return (
		<main className="landing-page bg-background text-foreground">
			{/* LP専用ヘッダー */}
			<LpHeader />

			{/* メインコンテンツ */}
			<div className="pt-16"> {/* ヘッダー分の余白 */}
				{/* ヒーローセクション */}
				<HeroSection />

				{/* 利用シーンセクション */}
				<FeaturesSection />

				{/* ゲーム紹介セクション */}
				<GamesSection />

				{/* 利用ステップセクション */}
				<StepsSection />

				{/* スペック紹介セクション */}
				<SpecsSection />

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