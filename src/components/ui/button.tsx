import React from 'react';
import Link from 'next/link';

type ButtonProps = {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
	disabled?: boolean;
	loading?: boolean;
	href?: string;
	onClick?: () => void;
	className?: string;
};

export default function Button({
	children,
	variant = 'primary',
	size = 'md',
	disabled = false,
	loading = false,
	href,
	onClick,
	className = '',
}: ButtonProps) {
	const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-accent text-white hover:bg-accent/90',
		secondary: 'bg-accent/10 text-accent hover:bg-accent/20',
		outline: 'border border-accent text-accent hover:bg-accent/10',
		ghost: 'text-accent hover:bg-accent/10',
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2',
		lg: 'px-6 py-3 text-lg',
	};

	const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

	// リンクの場合
	if (href) {
		return (
			<Link href={href} className={classes}>
				{loading ? (
					<>
						<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						読み込み中...
					</>
				) : (
					children
				)}
			</Link>
		);
	}

	// ボタンの場合
	return (
		<button
			onClick={onClick}
			disabled={disabled || loading}
			className={classes}
		>
			{loading ? (
				<>
					<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					読み込み中...
				</>
			) : (
				children
			)}
		</button>
	);
}