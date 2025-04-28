import { AuthProvider } from '@/context/auth-context';
import { AudioProvider } from '@/context/AudioContext';
import { ReservationProvider } from '@/context/reservation-context';
import ViewportInitializer from '@/components/ui/ViewportInitializer';
import PwaUpdateNotifier from '@/components/ui/pwa-update-notifier';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'E-Sports Sakura - コワーキングスペース会員ポータル',
	description: '24時間無人運営、QRコード1つで簡単入室。高性能PCとフリードリンクを完備したゲーミングスペース。',
	manifest: '/manifest.json',
	themeColor: '#fb923c',
	viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'black-translucent',
		title: 'E-Sports Sakura'
	},
};

export default function SecLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<head>
				<link rel="apple-touch-icon" href="/icons/apple-icon.png" />
			</head>
			<body>
				<AudioProvider>
					<AuthProvider>
						<ReservationProvider>
							<ViewportInitializer />
							<PwaUpdateNotifier />
							{children}
						</ReservationProvider>
					</AuthProvider>
				</AudioProvider>
			</body>
		</html>
	);
}