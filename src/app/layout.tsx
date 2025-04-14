import { AuthProvider } from '@/context/auth-context';
import { AudioProvider } from '@/context/AudioContext';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'E-Sports Sakura - コワーキングスペース会員ポータル',
	description: '24時間無人運営、QRコード1つで簡単入室。高性能PCとフリードリンクを完備したゲーミングスペース。',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="ja">
			<body>
				<AudioProvider>
					<AuthProvider>
							{children}
					</AuthProvider>
				</AudioProvider>
			</body>
		</html>
	);
}