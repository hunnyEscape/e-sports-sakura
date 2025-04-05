'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import VerificationStatus from '@/components/verification/verification-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function VerificationPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4 max-w-md">
					ログインが必要です。会員登録フローを開始するには、まずログインしてください。
				</div>
				<Link
					href="/login"
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</Link>
			</div>
		);
	}

	// 登録フロー全体が完了している場合
	if (userData?.registrationCompleted) {
		router.push('/dashboard');
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
				<span className="ml-3">ダッシュボードへリダイレクト中...</span>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			{/* メインコンテンツ */}
			<VerificationStatus />

			{/* FAQ セクション */}
			<div className="mt-8 bg-border/5 rounded-xl p-6 shadow-soft">
				<h3 className="text-lg font-medium mb-4">よくある質問</h3>
				<div className="space-y-4">
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">どんな身分証明書が使えますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							以下の身分証明書が使用できます：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>運転免許証</li>
								<li>パスポート</li>
								<li>マイナンバーカード（写真付き）</li>
								<li>在留カード</li>
							</ul>
							※通知カードや健康保険証など、顔写真がないものは利用できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認に失敗した場合はどうなりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							再度お試しいただけます。複数回失敗する場合は、以下をご確認ください：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>身分証明書が鮮明に写っているか</li>
								<li>顔写真と身分証明書の本人が一致しているか</li>
								<li>身分証明書の有効期限が切れていないか</li>
								<li>十分な明るさがあるか</li>
							</ul>
							何度も失敗する場合は、お問い合わせフォームからサポートにご連絡ください。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">カメラやマイクへのアクセス許可はなぜ必要ですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセスでは、身分証明書の撮影と顔認証のためにカメラアクセスが必要です。これらの許可は本人確認プロセスのみに使用され、安全に管理されます。許可を拒否すると、本人確認プロセスを完了できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認はどのくらいの時間がかかりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							通常、本人確認プロセス全体は2〜5分程度で完了します。審査結果は通常すぐに表示されますが、場合によっては数分かかることがあります。
						</div>
					</details>
				</div>
			</div>

			{/* プライバシーポリシーリンク */}
			<div className="mt-6 text-center text-sm text-foreground/60">
				本人確認の実施により、
				<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>
				と
				<Link href="/terms" className="text-accent hover:underline">利用規約</Link>
				に同意したものとみなされます。
			</div>
		</div>
	);
}