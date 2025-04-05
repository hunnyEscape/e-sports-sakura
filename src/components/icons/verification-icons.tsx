import React from 'react';

interface IconProps {
	className?: string;
	size?: number;
}

// 検証済みアイコン
export function VerifiedIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	);
}

// 検証失敗アイコン
export function VerificationFailedIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<line x1="15" y1="9" x2="9" y2="15" />
			<line x1="9" y1="9" x2="15" y2="15" />
		</svg>
	);
}

// 検証中アイコン
export function VerificationPendingIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

// 認証バッジ（SVGが用意できない場合の代替）
export function VerificationBadge({ className = "", size = 48 }: IconProps) {
	return (
		<div className={`relative ${className}`} style={{ width: size, height: size }}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-green-600"
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(22, 163, 74, 0.2)" />
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={size * 0.5}
					height={size * 0.5}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="text-green-600"
				>
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
			</div>
		</div>
	);
}