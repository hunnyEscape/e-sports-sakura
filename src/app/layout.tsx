
import { AuthProvider } from '@/context/auth-context';
import { AudioProvider } from '@/context/AudioContext';
import { ReservationProvider } from '@/context/reservation-context';
import ViewportInitializer from '@/components/ui/ViewportInitializer';
import PwaUpdateNotifier from '@/components/ui/pwa-update-notifier';
import { PwaInstallProvider } from '@/context/pwa-install-provider';
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
	other: {
		'apple-mobile-web-app-capable': 'yes',
		'mobile-web-app-capable': 'yes',
		'application-name': 'E-Sports Sakura',
		'apple-mobile-web-app-status-bar-style': 'black-translucent',
	}
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<head>
				<link rel="apple-touch-icon" href="/icons/apple-icon.png" />
				{/* iOS splash screens */}
				<link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
				<link rel="apple-touch-startup-image" href="/icons/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
				<link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
				<link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
			</head>
			<body>
				<AudioProvider>
					<AuthProvider>
						<ReservationProvider>
							<PwaInstallProvider>
								<ViewportInitializer />
								<PwaUpdateNotifier />
								{children}
							</PwaInstallProvider>
						</ReservationProvider>
					</AuthProvider>
				</AudioProvider>
			</body>
		</html>
	);
}