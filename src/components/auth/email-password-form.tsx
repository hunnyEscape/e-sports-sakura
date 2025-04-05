'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

type FormMode = 'login' | 'register' | 'forgotPassword';

export default function EmailPasswordForm() {
	const [mode, setMode] = useState<FormMode>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const {
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		error: authError,
		clearError
	} = useAuth();

	// フォームモード切り替え時にエラーとフィールドをリセット
	const switchMode = (newMode: FormMode) => {
		clearError();
		setFormError(null);
		setSuccessMessage(null);
		setMode(newMode);
	};

	// フォーム送信ハンドラ
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// フォームバリデーション
		if (!email) {
			setFormError('メールアドレスを入力してください。');
			return;
		}

		if (mode !== 'forgotPassword' && !password) {
			setFormError('パスワードを入力してください。');
			return;
		}

		if (mode === 'register' && password !== confirmPassword) {
			setFormError('パスワードが一致しません。');
			return;
		}

		setFormError(null);
		clearError();
		setIsSubmitting(true);

		try {
			switch (mode) {
				case 'login':
					await signInWithEmailAndPassword(email, password);
					break;
				case 'register':
					await createUserWithEmailAndPassword(email, password);
					break;
				case 'forgotPassword':
					await resetPassword(email);
					setSuccessMessage('パスワードリセットの手順をメールで送信しました。');
					break;
			}
		} catch (error) {
			// エラーはauthErrorで自動的に設定されるため、ここでは何もしない
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-full max-w-md">
			<div className="flex justify-center mb-6">
				<div className="inline-flex rounded-md">
					<button
						onClick={() => switchMode('login')}
						className={`px-4 py-2 text-sm font-medium rounded-l-md ${mode === 'login'
								? 'bg-accent text-white'
								: 'bg-border/10 text-foreground/70 hover:bg-border/20'
							}`}
					>
						ログイン
					</button>
					<button
						onClick={() => switchMode('register')}
						className={`px-4 py-2 text-sm font-medium rounded-r-md ${mode === 'register'
								? 'bg-accent text-white'
								: 'bg-border/10 text-foreground/70 hover:bg-border/20'
							}`}
					>
						新規登録
					</button>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* エラーメッセージ */}
				{(formError || authError) && (
					<div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
						{formError || authError}
					</div>
				)}

				{/* 成功メッセージ */}
				{successMessage && (
					<div className="bg-green-500/10 text-green-500 p-3 rounded-md text-sm">
						{successMessage}
					</div>
				)}

				{/* メールアドレス入力 */}
				<div>
					<label htmlFor="email" className="block text-sm font-medium text-foreground/70 mb-1">
						メールアドレス
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
						disabled={isSubmitting}
					/>
				</div>

				{/* パスワード入力（パスワードリセットモード以外） */}
				{mode !== 'forgotPassword' && (
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-foreground/70 mb-1">
							パスワード
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
							disabled={isSubmitting}
						/>
					</div>
				)}

				{/* パスワード確認（新規登録モードのみ） */}
				{mode === 'register' && (
					<div>
						<label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground/70 mb-1">
							パスワード（確認）
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
							disabled={isSubmitting}
						/>
					</div>
				)}

				{/* 送信ボタン */}
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-accent text-white font-medium py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
				>
					{isSubmitting ? (
						<LoadingSpinner size="small" />
					) : (
						mode === 'login'
							? 'ログイン'
							: mode === 'register'
								? 'アカウント作成'
								: 'パスワードリセット'
					)}
				</button>

				{/* パスワードを忘れた場合のリンク（ログインモードのみ） */}
				{mode === 'login' && (
					<div className="text-center mt-2">
						<button
							type="button"
							onClick={() => switchMode('forgotPassword')}
							className="text-sm text-accent hover:underline"
						>
							パスワードをお忘れですか？
						</button>
					</div>
				)}

				{/* 戻るリンク（パスワードリセットモードのみ） */}
				{mode === 'forgotPassword' && (
					<div className="text-center mt-2">
						<button
							type="button"
							onClick={() => switchMode('login')}
							className="text-sm text-accent hover:underline"
						>
							ログイン画面に戻る
						</button>
					</div>
				)}
			</form>
		</div>
	);
}