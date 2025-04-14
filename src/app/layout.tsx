// sec/app/layout.tsx
import { AuthProvider } from '@/context/auth-context';
import { AudioProvider } from '@/context/AudioContext';
import { ReservationProvider } from '@/context/reservation-context';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'E-Sports Sakura - コワーキングスペース会員ポータル',
	description: '24時間無人運営、QRコード1つで簡単入室。高性能PCとフリードリンクを完備したゲーミングスペース。',
};

export default function SecLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<body>
				<AudioProvider>
					<AuthProvider>
						<ReservationProvider>
							{children}
						</ReservationProvider>
					</AuthProvider>
				</AudioProvider>
			</body>
		</html>
	);
}
