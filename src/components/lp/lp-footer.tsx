import Link from 'next/link';

export default function LpFooter() {
	return (
		<footer className="bg-background border-t border-border py-8">
			<div className="container mx-auto px-4 text-center">
				<p className="text-foreground/70">
					&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
				</p>
				<div className="mt-4 flex flex-wrap justify-center gap-6">
					<Link href="/terms" className="text-foreground/50 hover:text-accent">
						利用規約
					</Link>
					<Link href="/privacy" className="text-foreground/50 hover:text-accent">
						プライバシーポリシー
					</Link>
					<Link href="/company" className="text-foreground/50 hover:text-accent">
						運営会社
					</Link>
					<Link href="/contact" className="text-foreground/50 hover:text-accent">
						お問い合わせ
					</Link>
				</div>
			</div>
		</footer>
	);
}