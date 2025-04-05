import { AuthProvider } from '@/context/auth-context';
import { EkycProvider } from '@/context/ekyc-context';
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
				<AuthProvider>
					<EkycProvider>
						{children}
					</EkycProvider>
				</AuthProvider>
			</body>
		</html>
	);
}