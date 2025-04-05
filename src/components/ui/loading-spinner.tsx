export default function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
	const sizeClasses = {
		small: 'h-4 w-4 border-2',
		default: 'h-8 w-8 border-2',
		large: 'h-12 w-12 border-3',
	};

	return (
		<div className="flex justify-center items-center">
			<div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-accent border-r-transparent border-b-transparent border-l-transparent`}></div>
			<span className="sr-only">読み込み中...</span>
		</div>
	);
}