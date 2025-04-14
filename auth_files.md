-e 
### FILE: ./src/types/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
	User,
	GoogleAuthProvider,
	signInWithPopup,
	createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
	signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut as firebaseSignOut,
	onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { UserDocument } from '@/types/firebase';

// コンテキストの型定義
interface AuthContextType {
	user: User | null;
	userData: UserDocument | null;
	loading: boolean;
	signInWithGoogle: () => Promise<void>;
	signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	createUserWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	error: string | null;
	clearError: () => void;
}

// デフォルト値
const defaultContextValue: AuthContextType = {
	user: null,
	userData: null,
	loading: true,
	signInWithGoogle: async () => { },
	signInWithEmailAndPassword: async () => { },
	createUserWithEmailAndPassword: async () => { },
	resetPassword: async () => { },
	signOut: async () => { },
	error: null,
	clearError: () => { }
};

// コンテキスト作成
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userData, setUserData] = useState<UserDocument | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// エラーをクリア
	const clearError = () => setError(null);

	// ユーザーの認証状態を監視
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			setUser(user);

			if (user) {
				try {
					// Firestoreからユーザーデータを取得
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						// 既存ユーザー - 最終ログイン時間を更新
						const userData = userDoc.data() as UserDocument;
						await setDoc(userDocRef, {
							...userData,
							lastLogin: serverTimestamp()
						}, { merge: true });
						setUserData(userData);
					} else {
						// 新規ユーザー
						const newUserData: UserDocument = {
							uid: user.uid,
							email: user.email,
							displayName: user.displayName,
							photoURL: user.photoURL,
							createdAt: serverTimestamp(),
							lastLogin: serverTimestamp(),
							registrationCompleted: false,
							registrationStep: 2,
						};

						await setDoc(userDocRef, newUserData);
						setUserData(newUserData);
					}
				} catch (err) {
					console.error('Error fetching user data:', err);
					setError('ユーザーデータの取得中にエラーが発生しました。');
				}
			} else {
				setUserData(null);
			}

			setLoading(false);
		});

		// クリーンアップ関数
		return () => unsubscribe();
	}, []);

	// Google認証でサインイン
	const signInWithGoogle = async () => {
		try {
			setError(null);
			await signInWithPopup(auth, googleProvider);
		} catch (err: any) {
			console.error('Google sign in error:', err);
			setError('Googleログイン中にエラーが発生しました。もう一度お試しください。');
			throw err;
		}
	};

	// メールパスワードでサインイン
	const signInWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseSignInWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Email/password sign in error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
				setError('メールアドレスまたはパスワードが正しくありません。');
			} else if (err.code === 'auth/too-many-requests') {
				setError('ログイン試行回数が多すぎます。しばらく経ってから再度お試しください。');
			} else {
				setError('ログイン中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// メールパスワードで新規ユーザー作成
	const createUserWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseCreateUserWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Create user error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/email-already-in-use') {
				setError('このメールアドレスは既に使用されています。');
			} else if (err.code === 'auth/weak-password') {
				setError('パスワードは6文字以上の強力なものを設定してください。');
			} else {
				setError('アカウント作成中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// パスワードリセットメール送信
	const resetPassword = async (email: string) => {
		try {
			setError(null);
			await sendPasswordResetEmail(auth, email);
		} catch (err: any) {
			console.error('Password reset error:', err);

			if (err.code === 'auth/user-not-found') {
				setError('このメールアドレスに登録されているアカウントが見つかりません。');
			} else {
				setError('パスワードリセットメールの送信中にエラーが発生しました。');
			}

			throw err;
		}
	};

	// サインアウト
	const signOut = async () => {
		try {
			await firebaseSignOut(auth);
		} catch (err) {
			console.error('Sign out error:', err);
			setError('ログアウト中にエラーが発生しました。');
			throw err;
		}
	};

	const value = {
		user,
		userData,
		loading,
		signInWithGoogle,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		signOut,
		error,
		clearError
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export const useAuth = () => useContext(AuthContext);-e 
### FILE: ./src/lib/face-verification-service.ts

import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserDocument } from '@/types/firebase';

/**
 * 顔認証サービスクラス
 * 顔動画の管理やステータス確認を行う
 */
export class FaceVerificationService {
  
  /**
   * ユーザーの顔認証ステータスを取得
   * @param userId ユーザーID
   * @returns 顔認証ステータス情報
   */
  static async getFaceVerificationStatus(userId: string): Promise<{
    isCompleted: boolean;
    isPending: boolean;
    isRejected: boolean;
    rejectionReason?: string;
  }> {
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません');
      }
      
      const userData = userDoc.data() as UserDocument;
      const faceVideo = userData.faceVideo;
      
      if (!faceVideo) {
        return {
          isCompleted: false,
          isPending: false,
          isRejected: false
        };
      }
      
      return {
        isCompleted: true,
        isPending: faceVideo.confirmed === null || faceVideo.confirmed === undefined,
        isRejected: faceVideo.confirmed === false,
        rejectionReason: faceVideo.rejectionReason
      };
    } catch (error) {
      console.error('顔認証ステータス取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * 顔動画の一時的なダウンロードURL生成
   * @param userId ユーザーID
   * @param expirationTimeMinutes URLの有効期限（分）
   * @returns 署名付きURL
   */
  static async getTemporaryDownloadUrl(userId: string, expirationTimeMinutes: number = 5): Promise<string> {
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません');
      }
      
      const userData = userDoc.data() as UserDocument;
      
      if (!userData.faceVideo?.storagePath) {
        throw new Error('顔動画が登録されていません');
      }
      
      const storage = getStorage();
      const videoRef = ref(storage, userData.faceVideo.storagePath);
      
      // Firebase Storageの署名付きURL（デフォルトで一時的なURLが生成される）
      // 注: この方法では厳密な有効期限指定はできないが、一般的には短期間の有効期限となる
      const downloadUrl = await getDownloadURL(videoRef);
      
      return downloadUrl;
    } catch (error) {
      console.error('ダウンロードURL生成エラー:', error);
      throw error;
    }
  }
  
  /**
   * 顔認証の再試行（既存のデータをリセット）
   * @param userId ユーザーID
   * @returns 成功したかどうか
   */
  static async resetFaceVerification(userId: string): Promise<boolean> {
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('ユーザーが見つかりません');
      }
      
      const userData = userDoc.data() as UserDocument;
      
      // 既存の顔動画がある場合は削除
      if (userData.faceVideo?.storagePath) {
        const storage = getStorage();
        const videoRef = ref(storage, userData.faceVideo.storagePath);
        await deleteObject(videoRef);
      }
      
      // Firestoreのデータもリセット
      await updateDoc(doc(db, 'users', userId), {
        faceVideo: null
      });
      
      return true;
    } catch (error) {
      console.error('顔認証リセットエラー:', error);
      return false;
    }
  }
  
  /**
   * 管理者用: フラグ付きユーザーの一覧取得
   * @returns フラグ付きユーザーリスト
   */
  static async getFlaggedUsers(): Promise<UserDocument[]> {
    try {
      const db = getFirestore();
      const usersRef = collection(db, 'users');
      
      // フラグが立っているユーザーを検索
      const q = query(
        usersRef, 
        where('faceVideo.flagged', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const flaggedUsers: UserDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        flaggedUsers.push(doc.data() as UserDocument);
      });
      
      return flaggedUsers;
    } catch (error) {
      console.error('フラグ付きユーザー取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * 管理者用: 顔認証ステータスの手動更新
   * @param userId ユーザーID
   * @param status 更新するステータス情報
   * @returns 成功したかどうか
   */
  static async updateVerificationStatus(
    userId: string,
    status: {
      confirmed: boolean;
      flagged?: boolean;
      rejectionReason?: string | null;
    }
  ): Promise<boolean> {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId);
      
      // 既存のfaceVideo情報を維持しつつステータスのみ更新
      await updateDoc(userDocRef, {
        'faceVideo.confirmed': status.confirmed,
        'faceVideo.flagged': status.flagged ?? false,
        'faceVideo.rejectionReason': status.rejectionReason || null,
        'faceVideo.checkedAt': new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      return false;
    }
  }
}

export default FaceVerificationService;-e 
### FILE: ./src/app/login/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import EmailPasswordForm from '@/components/auth/email-password-form';

export default function LoginPage() {
	const { user, loading, signInWithGoogle, error } = useAuth();
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// ユーザーが既にログインしている場合はダッシュボードにリダイレクト
		if (user && !loading) {
			router.push('/dashboard');
		}
	}, [user, loading, router]);

	const handleGoogleSignIn = async () => {
		try {
			setIsLoggingIn(true);
			await signInWithGoogle();
			// 認証成功時は自動的にリダイレクトされるため、ここでは何もしない
		} catch (err) {
			console.error('Login error:', err);
			setIsLoggingIn(false);
		}
	};

	if (loading || (user && !loading)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* ヘッダー */}
			<header className="bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/" className="flex items-center">
							<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
						</Link>

					</div>
				</div>
			</header>

			{/* ログインフォーム */}
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="bg-border/5 rounded-2xl shadow-soft p-8 max-w-md w-full">
					<h1 className="text-2xl font-bold text-center mb-8">ログイン / 会員登録</h1>

					{/* メールパスワードによるログイン/登録フォーム */}
					<div className="mb-8">
						<EmailPasswordForm />
					</div>

					{/* または区切り */}
					<div className="relative mb-8">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-background text-foreground/50">または</span>
						</div>
					</div>

					{/* ソーシャルログイン */}
					<div className="space-y-4">
						<button
							onClick={handleGoogleSignIn}
							disabled={isLoggingIn}
							className="
                w-full bg-white text-gray-700 font-medium
                px-4 py-3 rounded-xl border border-gray-300
                flex items-center justify-center space-x-2
                hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent
                disabled:opacity-70 disabled:cursor-not-allowed
                transition-colors duration-200
              "
						>
							{isLoggingIn ? (
								<LoadingSpinner size="small" />
							) : (
								<>
									<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
										<path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
										<path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
										<path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
										<path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
									</svg>
									<span>Googleでログイン</span>
								</>
							)}
						</button>

						<button
							disabled={true}
							className="
                w-full bg-black text-white font-medium
                px-4 py-3 rounded-xl
                flex items-center justify-center space-x-2
                opacity-50 cursor-not-allowed
              "
						>
							<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
							</svg>
							<span>Apple IDでログイン</span>
							<span className="text-xs ml-1">(準備中)</span>
						</button>
					</div>

					<p className="text-center text-foreground/60 text-sm mt-6">
						ログインすると<Link href="/terms" className="text-accent hover:underline">利用規約</Link>および
						<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に同意したことになります。
					</p>
				</div>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/complete/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function CompletePage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();
	const [completing, setCompleting] = useState(false);
	const [completed, setCompleted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 登録情報を確認し、必要に応じて完了フラグを設定
	useEffect(() => {
		const completeRegistration = async () => {
			if (!user || loading) return;

			// すでに登録完了している場合はダッシュボードにリダイレクト
			if (userData?.registrationCompleted) {
				router.push('/dashboard');
				return;
			}

			// 決済設定が完了している場合のみ、登録完了処理を行う
			if (
				userData?.stripe?.paymentSetupCompleted ||
				(typeof userData?.registrationStep === 'number' && userData.registrationStep >= 1)
			  ) {
			  
				try {
					setCompleting(true);

					// 登録完了フラグを設定
					await setDoc(doc(db, 'users', user.uid), {
						registrationCompleted: true,
						registrationCompletedAt: new Date().toISOString()
					}, { merge: true });

					setCompleted(true);

				} catch (err) {
					console.error('Error completing registration:', err);
					setError('登録完了処理中にエラーが発生しました。');
				} finally {
					setCompleting(false);
				}
			} else {
				// 決済設定が完了していない場合は決済ページにリダイレクト
				router.push('/register/payment');
			}
		};

		completeRegistration();
	}, [user, userData, loading, router]);

	const goToDashboard = () => {
		router.push('/dashboard');
	};

	// ローディング表示
	if (loading || completing) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<LoadingSpinner size="large" />
				<p className="mt-4 text-foreground/70">
					{completing ? '登録情報を完了しています...' : '読み込み中...'}
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto text-center">
			<div className="bg-border/5 rounded-xl shadow-soft p-8">
				<div className="mb-8">
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" viewBox="0 0 20 20" fill="currentColor">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
					</div>
				</div>

				<h2 className="text-2xl font-semibold mb-4">会員登録が完了しました！</h2>

				<p className="text-foreground/70 mb-8">
					E-Sports Sakuraの会員登録が正常に完了しました。<br />
					ダッシュボードから会員QRコードを確認し、店舗でのサービスをお楽しみください。
				</p>

				{error && (
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6 max-w-md mx-auto">
						{error}
						<p className="mt-2 text-sm">
							※エラーが発生しましたが、ダッシュボードから利用を開始できます。
						</p>
					</div>
				)}

				<Button
					onClick={goToDashboard}
					className="w-full max-w-md mx-auto"
				>
					ダッシュボードへ
				</Button>

				<div className="mt-8 p-4 bg-accent/10 rounded-lg max-w-md mx-auto">
					<h3 className="font-medium text-accent mb-2">次のステップ</h3>
					<ul className="text-left text-sm space-y-2">
						<li>• ダッシュボードから会員QRコードを表示</li>
						<li>• 店舗入口のQRリーダーにかざして入室</li>
						<li>• 店内のPCでも同じQRコードを使用</li>
						<li>• 退出時は自動的に料金計算されます</li>
					</ul>
				</div>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/verification/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import VerificationStatus from '@/components/verification/verification-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function VerificationPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4 max-w-md">
					ログインが必要です。会員登録フローを開始するには、まずログインしてください。
				</div>
				<Link
					href="/login"
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</Link>
			</div>
		);
	}

	// 登録フロー全体が完了している場合
	if (userData?.registrationCompleted) {
		router.push('/dashboard');
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
				<span className="ml-3">ダッシュボードへリダイレクト中...</span>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			{/* メインコンテンツ */}
			<VerificationStatus />

			{/* プライバシーポリシーリンク */}
			<div className="mt-6 text-center text-sm text-foreground/60">
				本人確認の実施により、
				<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>
				と
				<Link href="/terms" className="text-accent hover:underline">利用規約</Link>
				に同意したものとみなされます。
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/personal-info/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PersonalInfoRedirectPage() {
	const router = useRouter();

	// 本人確認ページに自動リダイレクト
	useEffect(() => {
		router.push('/register/verification');
	}, [router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
			<span className="ml-2">リダイレクト中...</span>
		</div>
	);
}-e 
### FILE: ./src/app/register/payment/page.tsx

// src/app/register/payment/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/auth-context';
import EnhancedCardForm from '@/components/payment/enhanced-card-form';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeの公開キーを使用してStripeをロード
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PaymentPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ユーザーがログインしていない場合はログインページへリダイレクト
	useEffect(() => {
		if (!loading && !user) {
			router.push('/login');
		}
	}, [user, loading, router]);

	// 登録が既に完了している場合はダッシュボードへリダイレクト
	useEffect(() => {
		if (userData?.registrationCompleted) {
			router.push('/dashboard');
		}
	}, [userData, router]);

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<div className="bg-border/5 rounded-xl shadow-soft p-6">
				<h2 className="text-xl font-semibold mb-2">決済情報の登録</h2>

				<div className="bg-border/10 text-white p-4 rounded-lg mb-6">
					<p>
						本サービスは月末締めの後払い方式です。<br />
						毎月末にご利用内容に基づいて請求書（インボイス）を発行し、<br />
						ご登録のお支払い方法（クレジットカードまたは銀行口座振替）にて自動で決済されます。
					</p>
				</div>

				<div className="space-y-6 mb-8">
					<div>
						<h3 className="text-lg font-medium mb-3">料金プラン</h3>

						<div className="bg-border/10 rounded-lg p-4">
							<div className="flex justify-between items-center mb-2">
								<span className="font-medium">従量課金</span>
								<span className="text-xl font-bold text-accent">¥400 <span className="text-sm font-normal">/時間</span></span>
							</div>
							<ul className="text-sm text-foreground/70 space-y-1">
								<li>• 1分単位での課金</li>
								<li>• フリードリンク・お菓子込み</li>
								<li>• 高性能ゲーミングPC利用可能</li>
								<li>• 深夜割増なし（24時間同一料金）</li>
							</ul>
						</div>
					</div>
					<div>
						<Elements stripe={stripePromise}>
							<EnhancedCardForm />
						</Elements>
					</div>
				</div>

				<div className="text-sm text-foreground/60 border-t border-border pt-4">
					<p>
						ご利用に関する注意事項:
					</p>
					<ul className="list-disc pl-5 mt-2 space-y-1">
						<li>料金は利用終了時に計算され、登録されたカードから自動的に請求されます</li>
						<li>領収書はメールで送信されます</li>
						<li>カード情報の変更はマイページから行えます</li>
					</ul>
				</div>
			</div>

			<div className="mt-6 text-center text-sm text-foreground/60">
				<p>
					決済情報の登録により、
					<Link href="/terms" className="text-accent hover:underline">利用規約</Link>と
					<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に
					同意したものとみなされます。
				</p>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/layout.tsx

'use client';
//src/app/register/layout.tsx
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { RegistrationProvider } from '@/context/registration-context';
import ProgressTracker from '@/components/registration/progress-tracker';
import ProtectedRoute from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const { user, loading } = useAuth();
	const router = useRouter();

	// 認証中の表示
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<ProtectedRoute>
			<RegistrationProvider>
				<div className="min-h-screen flex flex-col bg-background text-foreground">
					{/* ヘッダー */}
					<header className="bg-background/80 backdrop-blur-sm border-b border-border">
						<div className="container mx-auto px-4">
							<div className="flex items-center justify-between h-16">
								<Link href="/" className="flex items-center">
									<Image
										src="/images/logo.svg"
										alt="E-Sports Sakura"
										width={40}
										height={40}
										className="mr-2"
									/>
									<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
								</Link>

								<div className="flex items-center space-x-4">
									<Link href="/dashboard" className="text-foreground/70 hover:text-accent">
										登録をキャンセル
									</Link>
								</div>
							</div>
						</div>
					</header>

					{/* メインコンテンツ */}
					<main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
						<h1 className="text-2xl md:text-3xl font-bold text-center mb-8">会員登録</h1>

						{/* 進行状況トラッカー */}
						<ProgressTracker />

						{/* 各ステップのコンテンツ */}
						{children}
					</main>

					{/* フッター */}
					<footer className="bg-background border-t border-border py-4">
						<div className="container mx-auto px-4 text-center">
							<p className="text-foreground/60 text-sm">
								&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
							</p>
						</div>
					</footer>
				</div>
			</RegistrationProvider>
		</ProtectedRoute>
	);
}-e 
### FILE: ./src/app/register/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterIndexPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// 認証とデータのロードが完了したら処理
		if (!loading) {
			if (!user) {
				// 未ログインユーザーはログインページへ
				router.push('/login');
				return;
			}

			if (userData) {
				// 登録状態に応じて適切なページへリダイレクト
				if (userData.registrationCompleted) {
					// 登録済みならダッシュボードへ
					router.push('/dashboard');
				} else if (userData.registrationStep !== undefined) {
					// 登録途中ならその続きのページへ
					const steps = [
						'/register/verification',
						'/register/payment',
						'/register/complete'
					];
					router.push(steps[userData.registrationStep] || '/register/verification');
				} else {
					// 登録開始
					router.push('/register/verification');
				}
			} else {
				// userData読込中のエラー
				router.push('/register/verification');
			}
		}
	}, [user, userData, loading, router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
		</div>
	);
}-e 
### FILE: ./src/components/auth/email-password-form.tsx

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
}-e 
### FILE: ./src/components/auth/protected-route.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
	children: React.ReactNode;
	redirectUrl?: string;
}

export default function ProtectedRoute({
	children,
	redirectUrl = '/login'
}: ProtectedRouteProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push(redirectUrl);
		}
	}, [user, loading, router, redirectUrl]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return user ? <>{children}</> : null;
}-e 
### FILE: ./src/components/verification/face-video-capture.tsx

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface FaceVideoCaptureProps {
	onComplete: (success: boolean) => void;
	onError: (error: string) => void;
}

const FaceVideoCapture: React.FC<FaceVideoCaptureProps> = ({ onComplete, onError }) => {
	const { user } = useAuth();
	const videoRef = useRef<HTMLVideoElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const videoContainerRef = useRef<HTMLDivElement>(null);

	// 各種状態管理
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [status, setStatus] = useState<string>('初期化中...');
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [cameraReady, setCameraReady] = useState<boolean>(false);
	const [debugInfo, setDebugInfo] = useState<string>('');
	const [showCameraSelector, setShowCameraSelector] = useState<boolean>(false);
	const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<string>('');

	// 録画結果の Blob を保持（最終的に1つの動画）
	const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);

	// 各ポーズ（正面、左、右）ごとのオーバーレイ画像、案内文、録画時間（秒）
	const poseOverlays = [
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face1.webp`,
			alt: "Front Pose Overlay",
			instructions: "正面",
			duration: 5
		},
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face2.webp`,
			alt: "Left Pose Overlay",
			instructions: "左向き",
			duration: 5
		},
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face3.webp`,
			alt: "Right Pose Overlay",
			instructions: "右向き",
			duration: 5
		},
	];
	const totalRecordingDuration = poseOverlays.reduce((acc, curr) => acc + curr.duration, 0); // 合計15秒
	const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);

	// デバッグ情報を追加する関数
	const addDebugInfo = (info: string) => {
		setDebugInfo(prev => `${new Date().toLocaleTimeString()}: ${info}\n${prev}`);
	};

	// 利用可能なカメラデバイスの取得
	const getAvailableCameras = async () => {
		try {
			addDebugInfo("カメラデバイス一覧を取得中");
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');

			addDebugInfo(`検出されたカメラデバイス: ${videoDevices.length}台`);
			videoDevices.forEach((device, index) => {
				addDebugInfo(`デバイス ${index + 1}: ID=${device.deviceId}, ラベル=${device.label || '名称なし'}`);
			});

			setCameraDevices(videoDevices);

			// 初期デバイス設定
			if (videoDevices.length > 0 && !selectedCamera) {
				setSelectedCamera(videoDevices[0].deviceId);
				addDebugInfo(`初期カメラを設定: ${videoDevices[0].label || 'デバイス1'}`);
			}
		} catch (err) {
			addDebugInfo(`カメラデバイス取得エラー: ${err}`);
		}
	};

	// コンポーネント初期化時にカメラデバイス取得
	useEffect(() => {
		getAvailableCameras();
	}, []);

	// 選択したカメラでストリームを初期化
	const initializeCamera = async (deviceId?: string) => {
		try {
			setStatus('カメラへのアクセスを要求中...');
			addDebugInfo(`カメラ初期化: ${deviceId ? `デバイスID=${deviceId}` : '既定デバイス'}`);

			// すでにストリームがある場合は停止
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
				addDebugInfo("既存のカメラストリームを停止");
			}

			const constraints: MediaStreamConstraints = {
				audio: false,
				video: deviceId
					? {
						deviceId: { exact: deviceId },
						width: { ideal: 640 },
						height: { ideal: 480 }
					}
					: {
						width: { ideal: 640 },
						height: { ideal: 480 }
					}
			};

			addDebugInfo(`制約オブジェクト: ${JSON.stringify(constraints)}`);

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			addDebugInfo(`ストリーム取得成功: アクティブ=${stream.active}, トラック数=${stream.getTracks().length}`);

			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				addDebugInfo(`ビデオトラック: ${videoTrack.label}, 有効=${videoTrack.enabled}`);
				const settings = videoTrack.getSettings();
				addDebugInfo(`設定: 幅=${settings.width}, 高さ=${settings.height}, フレームレート=${settings.frameRate}`);
			}

			streamRef.current = stream;

			if (videoRef.current) {
				addDebugInfo("videoRef存在、ストリームをセット中");
				videoRef.current.style.width = '100%';
				videoRef.current.style.height = 'auto';
				videoRef.current.style.display = 'block';
				videoRef.current.style.objectFit = 'cover';
				videoRef.current.srcObject = stream;
				try {
					await videoRef.current.play();
					addDebugInfo("ビデオ再生開始成功");
					setCameraReady(true);
				} catch (e) {
					addDebugInfo(`ビデオ再生エラー: ${e}`);
					setStatus('カメラ映像の再生に失敗しました。再接続ボタンをクリックしてください。');
				}
			} else {
				addDebugInfo("videoRefが見つかりません");
			}

			setHasPermission(true);
			setStatus('');
			return true;
		} catch (err) {
			addDebugInfo(`カメラ初期化エラー: ${err}`);
			setHasPermission(false);
			onError(`カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。エラー: ${err}`);
			setStatus('エラー: カメラへのアクセスが許可されていません');
			return false;
		}
	};

	// カメラ選択時の処理
	const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		addDebugInfo(`カメラ変更: ${deviceId}`);
		setSelectedCamera(deviceId);
		setCameraReady(false);
		await initializeCamera(deviceId);
	};

	// video タグのイベントリスナー
	useEffect(() => {
		if (videoRef.current) {
			const videoElement = videoRef.current;
			const handleCanPlay = () => {
				addDebugInfo("ビデオ再生可能イベント発生");
				setCameraReady(true);
			};
			const handlePlaying = () => {
				addDebugInfo("ビデオ再生中イベント発生");
				setCameraReady(true);
			};
			const handleError = (e: any) => {
				addDebugInfo(`ビデオエラー発生: ${e}`);
			};
			videoElement.addEventListener('canplay', handleCanPlay);
			videoElement.addEventListener('playing', handlePlaying);
			videoElement.addEventListener('error', handleError);
			return () => {
				videoElement.removeEventListener('canplay', handleCanPlay);
				videoElement.removeEventListener('playing', handlePlaying);
				videoElement.removeEventListener('error', handleError);
			};
		}
	}, [videoRef.current]);

	useEffect(() => {
		if (selectedCamera) {
			initializeCamera(selectedCamera);
		}
	}, [selectedCamera]);

	useEffect(() => {
		if (hasPermission === true && videoRef.current) {
			const checkVideoInterval = setInterval(() => {
				const video = videoRef.current;
				if (video) {
					addDebugInfo(`ビデオ状態: 幅=${video.videoWidth}, 高さ=${video.videoHeight}, 再生中=${!video.paused}, 読込状態=${video.readyState}`);
					if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
						setCameraReady(true);
					}
					try {
						const canvas = document.createElement('canvas');
						canvas.width = 320;
						canvas.height = 240;
						const ctx = canvas.getContext('2d');
						if (ctx) {
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
							const imageData = ctx.getImageData(0, 0, 10, 10);
							let isAllZero = true;
							for (let i = 0; i < 10 * 10 * 4; i += 4) {
								if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || imageData.data[i + 2] > 0) {
									isAllZero = false;
									break;
								}
							}
							if (isAllZero) {
								addDebugInfo("警告: ビデオが真っ黒です（ピクセルデータがすべて0）");
							} else {
								addDebugInfo("ビデオに画像データあり");
							}
						}
					} catch (e) {
						addDebugInfo(`ピクセルデータ確認エラー: ${e}`);
					}
				}
			}, 3000);
			return () => clearInterval(checkVideoInterval);
		}
	}, [hasPermission]);

	// ■ 全ステップ録画：すべて一つの動画として15秒間連続で録画し、5秒ごとにオーバーレイ・案内を更新
	const startMultiStepRecording = () => {
		if (!cameraReady || !streamRef.current) {
			addDebugInfo("カメラが準備できていません");
			return;
		}
		// 初期化：最初のポーズを設定
		setCurrentPoseIndex(0);
		setStatus(poseOverlays[0].instructions);
		// 連続録画開始
		startRecording();
		setIsRecording(true);

		// 5秒後：左向きに更新
		setTimeout(() => {
			setCurrentPoseIndex(1);
			setStatus(poseOverlays[1].instructions);
		}, poseOverlays[0].duration * 1000);

		// 10秒後：右向きに更新
		setTimeout(() => {
			setCurrentPoseIndex(2);
			setStatus(poseOverlays[2].instructions);
		}, (poseOverlays[0].duration + poseOverlays[1].duration) * 1000);

		// 15秒後：録画停止
		setTimeout(() => {
			stopRecording(true);
		}, totalRecordingDuration * 1000);
	};

	// ■ 連続録画開始（単一の MediaRecorder で録画）
	const startRecording = () => {
		if (!streamRef.current) {
			addDebugInfo("エラー: カメラストリームが見つかりません");
			onError('カメラストリームが見つかりません。カメラを再接続してください。');
			return;
		}
		setStatus('録画中...');
		setIsRecording(true);

		const mimeTypes = [
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8',
			'video/webm',
			'video/mp4'
		];
		let options = {};
		for (const mimeType of mimeTypes) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				options = { mimeType };
				addDebugInfo(`サポートされているmimeType: ${mimeType}`);
				break;
			}
		}
		const recordedChunks: BlobPart[] = [];
		try {
			mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
			addDebugInfo(`MediaRecorder作成成功: ${mediaRecorderRef.current.state}`);
		} catch (e) {
			addDebugInfo(`MediaRecorderの作成に失敗: ${e}`);
			onError('録画機能の初期化に失敗しました。ブラウザの互換性を確認してください。');
			return;
		}
		mediaRecorderRef.current.ondataavailable = (event) => {
			addDebugInfo(`データ利用可能: ${event.data.size} bytes`);
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};
		mediaRecorderRef.current.onstop = async () => {
			addDebugInfo(`MediaRecorder停止、チャンク数: ${recordedChunks.length}`);
			if (recordedChunks.length === 0) {
				addDebugInfo("エラー: 録画データがありません");
				onError('録画データがありません。もう一度お試しください。');
				return;
			}
			const blob = new Blob(recordedChunks, { type: 'video/webm' });
			addDebugInfo(`Blob作成: ${blob.size} bytes`);
			if (blob.size < 1000) {
				addDebugInfo(`警告: 録画サイズが小さすぎます (${blob.size} bytes)`);
				onError('録画データが不完全です。もう一度お試しください。');
				return;
			}
			setRecordedVideoBlob(blob);
			setStatus('録画完了！');
			setIsRecording(false);
			onComplete(true);
		};
		mediaRecorderRef.current.onerror = (event) => {
			addDebugInfo(`MediaRecorderエラー: ${event}`);
			onError('録画中にエラーが発生しました。もう一度お試しください。');
		};
		mediaRecorderRef.current.start(1000);
		addDebugInfo("録画開始");
	};

	// ■ 連続録画停止（multiStep フラグが true の場合はタイマー経由の自動停止）
	const stopRecording = (multiStep?: boolean) => {
		if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
			addDebugInfo(`録画停止リクエスト。現在の状態: ${mediaRecorderRef.current.state}`);
			setStatus('録画完了。処理中...');
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		} else {
			const state = mediaRecorderRef.current ? mediaRecorderRef.current.state : "MediaRecorderなし";
			addDebugInfo(`録画を停止できません: ${state}`);
			onError(`録画を停止できません。録画の状態: ${state}`);
		}
	};

	// 録画動画をダウンロードするテスト用ボタンの処理
	const downloadVideo = () => {
		if (!recordedVideoBlob) return;
		const url = URL.createObjectURL(recordedVideoBlob);
		const a = document.createElement('a');
		a.style.display = 'none';
		a.href = url;
		a.download = `face_video.webm`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (hasPermission === false) {
		return (
			<div className="bg-background/80 p-6 rounded-xl shadow-soft">
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-2 max-w-md">
						<p className="text-lg font-medium">カメラへのアクセスが必要です</p>
						<p className="mt-2">本人確認のため、カメラの使用を許可してください。</p>
					</div>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
					>
						再試行
					</button>
				</div>
			</div>
		);
	}

	const reconnectCamera = async () => {
		setStatus('カメラを再接続中...');
		addDebugInfo("カメラ再接続試行");
		await getAvailableCameras();
		if (selectedCamera) {
			await initializeCamera(selectedCamera);
		} else {
			await initializeCamera();
		}
	};

	return (
		<div className="bg-background/80 p-6 rounded-xl shadow-soft">
			<div className="flex flex-col items-center space-y-4">
				{/* カメラ選択 */}
				{cameraDevices.length > 1 && (
					<div className="w-full max-w-md">
						<label className="block text-sm font-medium mb-1">カメラを選択:</label>
						<select
							value={selectedCamera}
							onChange={handleCameraChange}
							className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
						>
							{cameraDevices.map((device) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label || `カメラ ${cameraDevices.indexOf(device) + 1}`}
								</option>
							))}
						</select>
					</div>
				)}
				{/* ビデオプレビュー */}
				<div
					ref={videoContainerRef}
					className="relative w-full max-w-md bg-black rounded-lg overflow-hidden flex justify-center items-center"
					style={{
						minHeight: "320px",
						border: "1px solid #333"
					}}
				>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						style={{
							display: "block",
							width: "100%",
							height: "auto",
							minHeight: "320px",
							objectFit: "cover",
							backgroundColor: "#000",
						}}
					/>
					<img
						src={poseOverlays[currentPoseIndex].src}
						alt={poseOverlays[currentPoseIndex].alt}
						className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
					/>
					{hasPermission === true && !cameraReady && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/50">
							<div className="text-center">
								<LoadingSpinner/>
								<p className="text-white mt-2">カメラを準備中...</p>
							</div>
						</div>
					)}
				</div>
				{/* ステータス・案内表示 */}
				<p className="text-foreground/80 text-center">
					{poseOverlays[currentPoseIndex].instructions || status}
				</p>
				{/* 操作ボタン */}
				<div className="flex space-x-4">
					{!isRecording && (
						<>
							<button
								onClick={reconnectCamera}
								className="px-4 py-2 bg-border text-foreground rounded-lg hover:bg-border/80 mr-2"
							>
								カメラを再接続
							</button>
							<button
								onClick={startMultiStepRecording}
								disabled={hasPermission !== true}
								className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								録画開始
							</button>
						</>
					)}
					{isRecording && (
						<button
							onClick={() => stopRecording()}
							className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
						>
							録画停止
						</button>
					)}
				</div>
				{/* 録画完了後のダウンロードボタン */}
				{recordedVideoBlob && (
					<button
						onClick={downloadVideo}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg"
					>
						動画をダウンロード
					</button>
				)}
			</div>
		</div>
	);
};

export default FaceVideoCapture;
-e 
### FILE: ./src/components/verification/camera-test.tsx

'use client';

import React, { useRef, useState, useEffect } from 'react';

/**
 * カメラテスト用のシンプルなコンポーネント
 * 撮影・録画・アップロード機能はなく、カメラの表示テストのみを行う
 */
const CameraTest: React.FC = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<string>('');
	const [log, setLog] = useState<string>('初期化中...\n');
	const [showCanvas, setShowCanvas] = useState<boolean>(false);
	const [cameraReady, setCameraReady] = useState<boolean>(false);
	const [cameraSize, setCameraSize] = useState<{ width: number, height: number }>({ width: 640, height: 480 });

	// ログを追加する関数
	const addLog = (message: string) => {
		setLog(prev => `${new Date().toLocaleTimeString()}: ${message}\n${prev}`);
	};

	// 利用可能なカメラデバイスを取得
	const getAvailableCameras = async () => {
		try {
			addLog("カメラデバイス一覧を取得中...");
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');

			addLog(`検出されたカメラデバイス: ${videoDevices.length}台`);
			videoDevices.forEach((device, index) => {
				addLog(`デバイス ${index + 1}: ${device.label || '名称なし'} (${device.deviceId.substring(0, 10)}...)`);
			});

			setCameraDevices(videoDevices);

			// 初期デバイスを設定
			if (videoDevices.length > 0 && !selectedCamera) {
				setSelectedCamera(videoDevices[0].deviceId);
				addLog(`初期カメラを設定: ${videoDevices[0].label || 'デバイス1'}`);
			}

			return videoDevices;
		} catch (err) {
			addLog(`カメラデバイス取得エラー: ${err}`);
			return [];
		}
	};

	// 初期化時にカメラデバイスを取得
	useEffect(() => {
		getAvailableCameras();
	}, []);

	// カメラの初期化と開始
	const startCamera = async (deviceId?: string) => {
		try {
			// すでに使用中のカメラがあれば停止
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
				addLog("既存のカメラストリームを停止しました");
			}

			// カメラの制約オブジェクト
			const constraints: MediaStreamConstraints = {
				audio: false,
				video: deviceId
					? { deviceId: { exact: deviceId } }
					: true
			};

			addLog(`カメラに接続を試みます... ${deviceId ? `デバイスID: ${deviceId.substring(0, 10)}...` : '既定のカメラ'}`);

			// カメラへのアクセス要求
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			addLog(`カメラ接続成功: ビデオトラック数=${stream.getVideoTracks().length}`);

			// ビデオトラックの情報を確認
			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				addLog(`ビデオトラック情報: ${videoTrack.label}`);

				// 設定を取得
				const settings = videoTrack.getSettings();
				addLog(`ビデオ設定: 幅=${settings.width || '不明'}, 高さ=${settings.height || '不明'}, フレームレート=${settings.frameRate || '不明'}`);

				if (settings.width && settings.height) {
					setCameraSize({ width: settings.width, height: settings.height });
				}
			}

			streamRef.current = stream;

			// ビデオ要素にストリームをセット
			if (videoRef.current) {
				addLog("ビデオ要素にストリームをセットします");
				videoRef.current.srcObject = stream;
				videoRef.current.onloadedmetadata = () => {
					addLog("ビデオのメタデータを読み込みました");

					if (videoRef.current) {
						videoRef.current.play()
							.then(() => {
								addLog("ビデオの再生を開始しました");
								setCameraReady(true);
							})
							.catch(err => {
								addLog(`ビデオ再生エラー: ${err}`);
							});
					}
				};
			} else {
				addLog("エラー: ビデオ要素が見つかりません");
			}

			return true;
		} catch (err) {
			addLog(`カメラ初期化エラー: ${err}`);
			return false;
		}
	};

	// カメラ選択時の処理
	const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		addLog(`カメラ変更: ${deviceId.substring(0, 10)}...`);
		setSelectedCamera(deviceId);
		setCameraReady(false);
		startCamera(deviceId);
	};

	// キャンバスにビデオフレームをキャプチャ
	const captureFrame = () => {
		if (videoRef.current && canvasRef.current) {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			// キャンバスサイズをビデオに合わせる
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext('2d');
			if (ctx) {
				// ビデオフレームをキャンバスに描画
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				// 画像データを取得して解析
				try {
					const imageData = ctx.getImageData(0, 0, 20, 20);
					let totalBrightness = 0;

					// 最初の20x20ピクセルの明るさを計算
					for (let i = 0; i < 20 * 20 * 4; i += 4) {
						const r = imageData.data[i];
						const g = imageData.data[i + 1];
						const b = imageData.data[i + 2];
						// グレースケール変換（輝度を計算）
						const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
						totalBrightness += brightness;
					}

					const averageBrightness = totalBrightness / (20 * 20);
					addLog(`フレームキャプチャ: 平均輝度=${averageBrightness.toFixed(2)}`);

					if (averageBrightness < 10) {
						addLog("警告: 画像が非常に暗いです。カメラが正しく機能していない可能性があります。");
					}
				} catch (err) {
					addLog(`画像解析エラー: ${err}`);
				}

				setShowCanvas(true);
			}
		}
	};

	return (
		<div className="p-6 bg-background/80 rounded-xl shadow-soft">
			<h2 className="text-xl font-medium text-center mb-6">カメラテスト</h2>

			{/* カメラ選択 */}
			<div className="mb-4">
				<label className="block text-sm font-medium mb-1">カメラを選択:</label>
				<div className="flex space-x-2">
					<select
						value={selectedCamera}
						onChange={handleCameraChange}
						className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
					>
						{cameraDevices.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label || `カメラ ${cameraDevices.indexOf(device) + 1}`}
							</option>
						))}
					</select>
					<button
						onClick={() => getAvailableCameras()}
						className="px-3 py-2 bg-border text-foreground rounded-lg hover:bg-border/80"
					>
						更新
					</button>
				</div>
			</div>

			{/* カメラ表示エリア */}
			<div className="mb-4 relative">
				<div className="w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						style={{
							width: '100%',
							height: 'auto',
							display: 'block',
							backgroundColor: '#000',
						}}
					/>

					{!cameraReady && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
							カメラの準備中...
						</div>
					)}
				</div>

				{/* カメラ情報 */}
				<div className="mt-2 text-sm">
					<p>解像度: {cameraSize.width} x {cameraSize.height}</p>
				</div>
			</div>

			{/* 操作ボタン */}
			<div className="flex flex-wrap gap-2 mb-4">
				<button
					onClick={() => startCamera(selectedCamera)}
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					カメラを開始
				</button>
				<button
					onClick={captureFrame}
					disabled={!cameraReady}
					className="px-4 py-2 bg-highlight text-white rounded-lg hover:bg-highlight/90 disabled:opacity-50"
				>
					フレームキャプチャ
				</button>
				<button
					onClick={() => {
						if (streamRef.current) {
							streamRef.current.getTracks().forEach(track => track.stop());
							addLog("カメラを停止しました");
							setCameraReady(false);
						}
					}}
					disabled={!cameraReady}
					className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
				>
					カメラを停止
				</button>
			</div>

			{/* キャプチャしたフレーム表示 */}
			{showCanvas && (
				<div className="mb-4">
					<h3 className="text-sm font-medium mb-1">キャプチャしたフレーム:</h3>
					<canvas
						ref={canvasRef}
						className="border border-border rounded-lg"
						style={{ maxWidth: '100%', height: 'auto' }}
					/>
				</div>
			)}

			{/* ログ表示 */}
			<div className="mt-4">
				<h3 className="text-sm font-medium mb-1">カメラログ:</h3>
				<pre className="p-3 text-xs bg-background/30 rounded-lg h-40 overflow-auto whitespace-pre-wrap">
					{log}
				</pre>
			</div>
		</div>
	);
};

export default CameraTest;-e 
### FILE: ./src/components/verification/verification-status-v2.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useAuth } from '@/context/auth-context';
import { useEkyc } from '@/context/ekyc-context';
import {
	VerifiedIcon,
	VerificationFailedIcon,
	VerificationPendingIcon,
	VerificationBadge
} from '@/components/icons/verification-icons';
import { createVeriffSession } from '@/lib/veriff';

export default function VerificationStatusV2() {
	const router = useRouter();
	const { user } = useAuth();
	const { ekycData, isLoading, error: ekycError, resetEkycStatus } = useEkyc();
	const [isStartingVerification, setIsStartingVerification] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(5);
	const [showHelpSection, setShowHelpSection] = useState(false);

	// 検証完了時の自動リダイレクト
	useEffect(() => {
		if (ekycData?.status === 'completed') {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						router.push('/register/payment');
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, router]);

	// 本人確認を開始
	const startVerification = async () => {
		if (!user || !user.email) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsStartingVerification(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してVeriffセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || '本人確認の開始に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				return;
			}

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError(`本人確認の開始中にエラーが発生しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
			setIsStartingVerification(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsStartingVerification(true);
		setError(null);

		try {
			// 開発環境用のAPIエンドポイント
			const response = await fetch('/api/veriff/simulate-complete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await user.getIdToken()}`
				}
			});

			if (!response.ok) {
				throw new Error('シミュレーション失敗');
			}

			// APIレスポンスを待つ必要はなく、Firestoreリスナーが状態を更新
			setTimeout(() => {
				setIsStartingVerification(false);
			}, 1500);

		} catch (err) {
			console.error('Error in simulation:', err);
			setError('シミュレーション中にエラーが発生しました');
			setIsStartingVerification(false);
		}
	};

	// 検証をリセット
	const handleReset = async () => {
		setIsStartingVerification(true);
		try {
			await resetEkycStatus();
			setIsStartingVerification(false);
		} catch (err) {
			setIsStartingVerification(false);
		}
	};

	// ステータスに応じたコンテンツをレンダリング
	const renderStatusContent = () => {
		if (isLoading) {
			return (
				<div className="flex justify-center items-center py-10">
					<LoadingSpinner size="large" />
				</div>
			);
		}

		switch (ekycData?.status) {
			case 'completed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-green-500/10 text-green-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-green-100 rounded-full p-2 mr-4">
								<VerifiedIcon size={32} />
							</div>
							<div>
								<h3 className="text-lg font-medium">本人確認が完了しました</h3>
								<p className="text-sm opacity-80">
									{ekycData.verifiedAt ?
										`確認日時: ${new Date(ekycData.verifiedAt).toLocaleString('ja-JP')}` :
										'正常に認証されました'}
								</p>
							</div>
						</div>

						<div className="bg-white/50 rounded-lg p-4 mb-4">
							<div className="flex items-center">
								<VerificationBadge className="mr-3" />
								<div>
									<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
									<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-sm">
								{`${countdown}秒後に決済情報登録へ移動します...`}
							</span>
							<Button
								onClick={() => router.push('/register/payment')}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								今すぐ次へ
							</Button>
						</div>
					</motion.div>
				);

			case 'failed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-red-500/10 text-red-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-red-100 rounded-full p-2 mr-4">
								<VerificationFailedIcon size={32} />
							</div>
							<div>
								<h3 className="text-lg font-medium">本人確認に失敗しました</h3>
								<p className="text-sm opacity-80">
									問題が発生したため、本人確認プロセスを完了できませんでした
								</p>
							</div>
						</div>

						<div className="bg-white/50 rounded-lg p-4 mb-4">
							<h4 className="font-medium mb-2">考えられる原因:</h4>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>写真が鮮明でなかった</li>
								<li>身分証明書が有効でなかった</li>
								<li>顔と身分証の写真が一致しなかった</li>
								<li>ネットワーク接続に問題があった</li>
							</ul>
						</div>

						<div className="flex justify-end space-x-4">
							<Button
								onClick={handleReset}
								variant="outline"
								disabled={isStartingVerification}
							>
								初めからやり直す
							</Button>
							<Button
								onClick={startVerification}
								disabled={isStartingVerification}
							>
								{isStartingVerification ? <LoadingSpinner size="small" /> : '再試行する'}
							</Button>
						</div>
					</motion.div>
				);

			case 'pending':
			default:
				return (
					<div className="space-y-6">
						<div className="bg-blue-500/10 text-blue-600 p-6 rounded-xl">
							<div className="flex items-center mb-4">
								<div className="bg-blue-100 rounded-full p-2 mr-4">
									<VerificationPendingIcon size={32} />
								</div>
								<div>
									<h3 className="text-lg font-medium">本人確認を開始しましょう</h3>
									<p className="text-sm opacity-80">
										安全なサービス提供のため、身分証明書による本人確認が必要です
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">身分証撮影</h4>
									<p className="text-xs text-center">
										身分証明書の表面と裏面を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">顔写真撮影</h4>
									<p className="text-xs text-center">
										自撮りで本人確認用の写真を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">自動審査</h4>
									<p className="text-xs text-center">
										AIによる自動審査ですぐに結果が出ます
									</p>
								</div>
							</div>
						</div>

						<AnimatePresence>
							{showHelpSection && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.3 }}
									className="overflow-hidden"
								>
									<div className="bg-border/5 rounded-xl p-6 shadow-soft">
										<h3 className="text-lg font-medium mb-3">本人確認に必要なもの</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）</li>
											<li>カメラ付きデバイス（スマートフォン、PC）</li>
											<li>良好な照明環境</li>
										</ul>

										<h4 className="font-medium mt-4 mb-2">準備のポイント</h4>
										<ul className="list-disc pl-5 space-y-1 text-sm">
											<li>身分証明書の情報が鮮明に見えるようにしてください</li>
											<li>反射や影が写り込まないよう注意してください</li>
											<li>顔写真撮影時は、明るい場所で正面から撮影してください</li>
											<li>眼鏡やマスクは外してください</li>
										</ul>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="flex flex-col space-y-4">
							<Button
								onClick={() => setShowHelpSection(!showHelpSection)}
								variant="outline"
								className="self-start"
							>
								{showHelpSection ? '準備のポイントを隠す' : '準備のポイントを表示する'}
							</Button>

							<div className="pt-2">
								{process.env.NODE_ENV === 'development' ? (
									<div className="space-y-4">
										<Button
											onClick={startVerification}
											disabled={isStartingVerification}
											className="w-full"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
										</Button>
										<Button
											onClick={simulateVerification}
											disabled={isStartingVerification}
											className="w-full bg-gray-500 hover:bg-gray-600"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
										</Button>
									</div>
								) : (
									<Button
										onClick={startVerification}
										disabled={isStartingVerification}
										className="w-full"
									>
										{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
								)}
							</div>
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{(error || ekycError) && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error || ekycError}
				</div>
			)}

			{renderStatusContent()}
		</div>
	);
}-e 
### FILE: ./src/components/verification/verification-status.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { VerifiedIcon, VerificationPendingIcon } from '@/components/icons/verification-icons';
import LoadingSpinner from '@/components/ui/loading-spinner';
import FaceVideoCapture from './face-video-capture';
import CameraTest from '@/components/verification/camera-test';
const VerificationStatus = () => {
	const { user, userData, loading } = useAuth();
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState<number>(1);
	const [showCamera, setShowCamera] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);
	const [isCompleted, setIsCompleted] = useState<boolean>(false);

	// ユーザーの登録ステップを追跡
	useEffect(() => {
		if (!loading && userData) {
			// faceVideoが存在すれば顔認証ステップは完了
			const faceVideoCompleted = userData.faceVideo && userData.faceVideo.storagePath;

			// 現在のステップを決定
			if (!faceVideoCompleted) {
				setCurrentStep(1); // 顔認証ステップ
			} else {
				setCurrentStep(2); // 完了ステップ
			}
		}
	}, [userData, loading]);

	// ローディング状態
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="bg-red-500/10 text-red-500 p-6 rounded-lg max-w-md mx-auto">
				<p className="font-medium">ログインが必要です</p>
				<p className="mt-2">本人確認を行うにはログインしてください。</p>
				<button
					onClick={() => router.push('/login')}
					className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</button>
			</div>
		);
	}

	// 登録ステップの完了処理
	const completeStep = async (step: number) => {
		if (!user) return;

		try {
			const db = getFirestore();
			const userDocRef = doc(db, 'users', user.uid);

			// 現在のステップを更新
			await updateDoc(userDocRef, {
				registrationStep: 3 // 本人確認ステップを完了
			});

			// 次のステップに進む
			router.push('/register/payment');
		} catch (error) {
			console.error('ステップ更新エラー:', error);
			setError('処理中にエラーが発生しました。もう一度お試しください。');
		}
	};

	// 顔認証の完了処理
	const handleVerificationComplete = (success: boolean) => {
		if (success) {
			setIsCompleted(true);
			// 少し遅延を入れて次のステップに進む
			setTimeout(() => {
				completeStep(1);
			}, 1500);
		}
	};

	// エラー処理
	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setShowCamera(false);
	};

	// 顔認証が既に完了している場合
	if (userData?.faceVideo && userData.faceVideo.storagePath) {
		return (
			<div className="max-w-md mx-auto">
				<div className="bg-highlight/10 p-6 rounded-xl shadow-soft mb-8">
					<div className="flex flex-col items-center text-center space-y-3">
						<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
							<VerifiedIcon size={24} />
						</div>
						<h3 className="text-lg font-medium">顔認証登録済み</h3>
						<p className="text-foreground/70">
							顔認証の登録が完了しています。次のステップに進むことができます。
							{userData.faceVideo.confirmed === false && (
								<span className="text-red-500 block mt-2">
									※システムによる確認中です。問題があれば後ほどご連絡いたします。
								</span>
							)}
						</p>
						<button
							onClick={() => completeStep(1)}
							className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
						>
							次へ進む
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto mt-8">
			<div className="bg-border/5 p-6 rounded-xl shadow-soft mb-8">
				<h2 className="text-xl font-medium text-center mb-4">本人確認</h2>
				{isCompleted ? (
					<div className="flex flex-col items-center text-center space-y-3 py-4">
						<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
							<VerifiedIcon size={24} />
						</div>
						<h3 className="text-lg font-medium">顔認証登録完了</h3>
						<p className="text-foreground/70">顔認証の登録が完了しました。次の手順に進みます...</p>
						<LoadingSpinner size="small" />
					</div>
				) : showCamera ? (
					<FaceVideoCapture 
						onComplete={handleVerificationComplete} 
						onError={handleError} 
					/>
				) : (
					<div className="flex flex-col items-center space-y-6">
						<div className="text-center">
							<p className="mb-3 text-foreground/80">
								本人確認のため、顔認証を行います。顔動画を撮影して登録してください。
							</p>
							<div className="flex justify-center">
								<div className="w-48 h-48 bg-border/10 rounded-full flex items-center justify-center text-foreground/60">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
							</div>
						</div>
						
						{error && (
							<div className="bg-red-500/10 text-red-500 p-4 rounded-lg w-full max-w-md">
								{error}
							</div>
						)}
						
						<div className="w-full max-w-md">
							<div className="bg-border/5 p-4 rounded-lg text-sm text-foreground/80">
								<h4 className="font-medium text-foreground">撮影時の注意事項:</h4>
								<ul className="list-disc pl-5 mt-2 space-y-1">
									<li>明るい場所で顔が明確に見えるようにしてください</li>
									<li>録画中は顔を左右にゆっくり動かしてください</li>
									<li>サングラス、マスク、帽子などを着用しないでください</li>
									<li>撮影した顔動画は本人確認の目的でのみ使用されます</li>
								</ul>
							</div>
							
							<div className="mt-4 flex items-start space-x-2">
								<input
									type="checkbox"
									id="privacy-agreement"
									checked={privacyAgreed}
									onChange={(e) => setPrivacyAgreed(e.target.checked)}
									className="mt-1"
								/>
								<label htmlFor="privacy-agreement" className="text-sm text-foreground/80">
									顔動画の撮影・保存に同意します。この情報は本人確認とトラブル時の照合にのみ使用され、
									プライバシーポリシーに則って管理されます。
								</label>
							</div>
						</div>
						
						<button
							onClick={() => setShowCamera(true)}
							disabled={!privacyAgreed}
							className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							顔認証を開始
						</button>
					</div>
				)}
			</div>
			
			{/* FAQ セクション */}
			<div className="bg-border/5 rounded-xl p-6 shadow-soft">
				<h3 className="text-lg font-medium mb-4">よくある質問</h3>
				<div className="space-y-4">
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">なぜ顔認証が必要なのですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							カフェ運営上の不正利用防止のために本人確認を行っています。より良いサービス提供のためご協力お願いいたします。
						</div>
					</details>
					
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">撮影した顔動画はどのように管理されますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							撮影した顔動画は暗号化された形で安全に保管され、厳格なアクセス制限のもとで管理されます。会員様ご本人と当社の管理者のみがアクセスでき、本人確認以外の目的では使用いたしません。
						</div>
					</details>
					
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">顔認証に失敗した場合はどうすればいいですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							顔認証に失敗した場合は、明るい場所で再度撮影をお試しください。何度も失敗する場合は、カスタマーサポートにご連絡いただくか、店舗スタッフにお問い合わせください。
						</div>
					</details>
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認に失敗した場合はどうなりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							再度お試しいただけます。複数回失敗する場合は、以下をご確認ください：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>身分証明書が鮮明に写っているか</li>
								<li>顔写真と身分証明書の本人が一致しているか</li>
								<li>身分証明書の有効期限が切れていないか</li>
								<li>十分な明るさがあるか</li>
							</ul>
							何度も失敗する場合は、お問い合わせフォームからサポートにご連絡ください。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">カメラやマイクへのアクセス許可はなぜ必要ですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセスでは、身分証明書の撮影と顔認証のためにカメラアクセスが必要です。これらの許可は本人確認プロセスのみに使用され、安全に管理されます。許可を拒否すると、本人確認プロセスを完了できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認はどのくらいの時間がかかりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセス全体は2〜5分程度で完了します。
						</div>
					</details>
				</div>
			</div>
		</div>
	);
};

export default VerificationStatus;-e 
### FILE: ./src/components/verification/verification-complete.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Button from '@/components/ui/button';
import { useEkyc } from '@/context/ekyc-context';

interface VerificationCompleteProps {
	onContinue?: () => void;
	autoRedirectDelay?: number; // 秒数
	redirectUrl?: string;
}

export default function VerificationComplete({
	onContinue,
	autoRedirectDelay = 5,
	redirectUrl = '/register/payment'
}: VerificationCompleteProps) {
	const router = useRouter();
	const { ekycData } = useEkyc();
	const [countdown, setCountdown] = useState(autoRedirectDelay);
	const [isRedirecting, setIsRedirecting] = useState(false);

	// 本人確認が完了している場合のみカウントダウン
	useEffect(() => {
		if (ekycData?.status === 'completed' && !isRedirecting) {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						handleContinue();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, isRedirecting]);

	// 次へ進むハンドラー
	const handleContinue = () => {
		setIsRedirecting(true);

		if (onContinue) {
			onContinue();
		} else {
			router.push(redirectUrl);
		}
	};

	if (ekycData?.status !== 'completed') {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="bg-green-500/10 text-green-600 p-6 rounded-xl"
		>
			<div className="flex items-center mb-4">
				<div className="bg-green-100 rounded-full p-2 mr-4">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
				</div>
				<div>
					<h3 className="text-lg font-medium">本人確認が完了しました</h3>
					<p className="text-sm opacity-80">
						{ekycData.verifiedAt ?
							`確認日時: ${new Date(ekycData.verifiedAt).toLocaleString('ja-JP')}` :
							'正常に認証されました'}
					</p>
				</div>
			</div>

			<div className="bg-white/50 rounded-lg p-4 mb-4">
				<div className="flex items-center">
					<Image
						src="/images/verification-badge.svg"
						alt="認証済みバッジ"
						width={48}
						height={48}
						className="mr-3"
					/>
					<div>
						<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
						<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<span className="text-sm">
					{isRedirecting ?
						'次のステップへ移動中...' :
						`${countdown}秒後に自動的に次のステップへ移動します...`}
				</span>
				<Button
					onClick={handleContinue}
					disabled={isRedirecting}
					className="bg-green-600 hover:bg-green-700 text-white"
				>
					今すぐ次へ
				</Button>
			</div>
		</motion.div>
	);
}-e 
### FILE: ./src/components/verification/face-verification-section.tsx

'use client';

import React, { useState } from 'react';
import FaceVideoCapture from './face-video-capture';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface FaceVerificationSectionProps {
	onComplete: () => void;
}

const FaceVerificationSection: React.FC<FaceVerificationSectionProps> = ({ onComplete }) => {
	const { userData, loading } = useAuth();
	const [showCamera, setShowCamera] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);
	const [isCompleted, setIsCompleted] = useState<boolean>(false);

	// ローディング状態のハンドリング
	if (loading) {
		return (
			<div className="flex justify-center items-center py-6">
				<LoadingSpinner/>
			</div>
		);
	}

	// 顔認証が既に完了している場合
	if (userData?.faceVideo && userData.faceVideo.storagePath) {
		return (
			<div className="bg-highlight/10 p-6 rounded-xl shadow-soft mb-8">
				<div className="flex flex-col items-center text-center space-y-3">
					<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h3 className="text-lg font-medium">顔認証登録済み</h3>
					<p className="text-foreground/70">
						顔認証の登録が完了しています。
						{userData.faceVideo.confirmed === false && (
							<span className="text-red-500 block mt-2">
								※システムによる確認中です。問題があれば後ほどご連絡いたします。
							</span>
						)}
					</p>
					<button
						onClick={onComplete}
						className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
					>
						次へ進む
					</button>
				</div>
			</div>
		);
	}

	// 顔認証の完了処理
	const handleVerificationComplete = (success: boolean) => {
		if (success) {
			setIsCompleted(true);
			// 少し遅延を入れて次のステップに進む
			setTimeout(() => {
				onComplete();
			}, 1500);
		}
	};

	// エラー処理
	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setShowCamera(false);
	};

	return (
		<div className="bg-border/5 p-6 rounded-xl shadow-soft mb-8">
			<h2 className="text-xl font-medium text-center mb-4">顔認証</h2>

			{isCompleted ? (
				<div className="flex flex-col items-center text-center space-y-3 py-4">
					<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h3 className="text-lg font-medium">顔認証登録完了</h3>
					<p className="text-foreground/70">顔認証の登録が完了しました。次の手順に進みます...</p>
					<LoadingSpinner size="small" />
				</div>
			) : showCamera ? (
				<FaceVideoCapture
					onComplete={handleVerificationComplete}
					onError={handleError}
				/>
			) : (
				<div className="flex flex-col items-center space-y-6">
					<div className="text-center">
						<p className="mb-3 text-foreground/80">
							本人確認のため、顔認証を行います。顔動画を撮影して登録してください。
						</p>
						<div className="flex justify-center">
							<img
								src="/images/face-verification-sample.svg"
								alt="顔認証イメージ"
								className="w-48 h-auto opacity-80"
							/>
						</div>
					</div>

					{error && (
						<div className="bg-red-500/10 text-red-500 p-4 rounded-lg w-full max-w-md">
							{error}
						</div>
					)}

					<div className="w-full max-w-md">
						<div className="bg-border/5 p-4 rounded-lg text-sm text-foreground/80">
							<h4 className="font-medium text-foreground">撮影時の注意事項:</h4>
							<ul className="list-disc pl-5 mt-2 space-y-1">
								<li>明るい場所で顔が明確に見えるようにしてください</li>
								<li>録画中は顔を左右にゆっくり動かしてください</li>
								<li>サングラス、マスク、帽子などを着用しないでください</li>
								<li>撮影した顔動画は本人確認の目的でのみ使用されます</li>
							</ul>
						</div>

						<div className="mt-4 flex items-start space-x-2">
							<input
								type="checkbox"
								id="privacy-agreement"
								checked={privacyAgreed}
								onChange={(e) => setPrivacyAgreed(e.target.checked)}
								className="mt-1"
							/>
							<label htmlFor="privacy-agreement" className="text-sm text-foreground/80">
								顔動画の撮影・保存に同意します。この情報は本人確認とトラブル時の照合にのみ使用され、
								<span className="text-accent hover:underline cursor-pointer">プライバシーポリシー</span>
								に則って管理されます。
							</label>
						</div>
					</div>

					<button
						onClick={() => setShowCamera(true)}
						disabled={!privacyAgreed}
						className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						顔認証を開始
					</button>
				</div>
			)}
		</div>
	);
};

export default FaceVerificationSection;-e 
### FILE: ./src/components/icons/verification-icons.tsx

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
}-e 
### FILE: ./src/components/reservation/login-prompt.tsx

// src/components/reservation/login-prompt.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SelectedTimeSlotsItem } from '@/context/reservation-context';

interface LoginPromptProps {
	onClose: () => void;
	reservationDetails: (SelectedTimeSlotsItem & { date: string })[];
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose, reservationDetails }) => {
	const router = useRouter();

	// Handle login button
	const handleLogin = () => {
		// Store reservation details in sessionStorage to retrieve after login
		sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
		router.push('/login');
	};

	// Handle register button
	const handleRegister = () => {
		// Store reservation details in sessionStorage to retrieve after registration
		sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
		router.push('/register');
	};

	// Calculate total seats
	const totalSeats = reservationDetails.length;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		>
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				className="bg-background border border-border/20 rounded-lg shadow-lg p-6 max-w-md w-full"
			>
				<h2 className="text-xl font-bold text-foreground mb-4">アカウントが必要です</h2>
				<p className="text-foreground/70 mb-6">
					予約を完了するには、ログインまたは新規登録が必要です。
				</p>

				<div className="bg-border/5 p-3 rounded-md mb-6">
					<h3 className="font-medium text-foreground mb-2">選択中の予約内容</h3>
					<p className="text-sm text-foreground/70">
						<span className="font-medium">{totalSeats}席</span>の予約
						<span className="block mt-1">
							{new Date(reservationDetails[0].date).toLocaleDateString('ja-JP', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								weekday: 'long'
							})}
						</span>
					</p>

					{/* 予約情報のサマリー */}
					<div className="mt-2 space-y-1 text-sm text-foreground/70">
						{reservationDetails.map((item, index) => (
							<div key={index} className="flex justify-between">
								<span>{item.seatName || `座席 #${index + 1}`}</span>
								<span>{item.startTime} - {item.endTime}</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col space-y-3">
					<button
						onClick={handleLogin}
						className="flex items-center justify-center px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						<Lock className="w-4 h-4 mr-2" />
						ログイン
					</button>
					<button
						onClick={handleRegister}
						className="flex items-center justify-center px-4 py-2 border border-accent text-accent bg-accent/5 rounded-md hover:bg-accent/10 transition-colors"
					>
						<UserPlus className="w-4 h-4 mr-2" />
						新規登録
					</button>
					<button
						onClick={onClose}
						className="px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-md transition-colors"
					>
						キャンセル
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default LoginPrompt;-e 
### FILE: ./src/context/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
	User,
	GoogleAuthProvider,
	signInWithPopup,
	createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
	signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut as firebaseSignOut,
	onAuthStateChanged
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { UserDocument } from '@/types/firebase';

// コンテキストの型定義
interface AuthContextType {
	user: User | null;
	userData: UserDocument | null;
	loading: boolean;
	signInWithGoogle: () => Promise<void>;
	signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	createUserWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	error: string | null;
	clearError: () => void;
}

// デフォルト値
const defaultContextValue: AuthContextType = {
	user: null,
	userData: null,
	loading: true,
	signInWithGoogle: async () => { },
	signInWithEmailAndPassword: async () => { },
	createUserWithEmailAndPassword: async () => { },
	resetPassword: async () => { },
	signOut: async () => { },
	error: null,
	clearError: () => { }
};

// コンテキスト作成
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userData, setUserData] = useState<UserDocument | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// エラーをクリア
	const clearError = () => setError(null);

	// ユーザーの認証状態を監視し、Firestore のユーザードキュメントの変更をリアルタイムで反映
	useEffect(() => {
		const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
			setUser(user);
			setLoading(false);

			if (user) {
				// Firestore のユーザードキュメントをリアルタイムで監視
				const userDocRef = doc(db, 'users', user.uid);
				const unsubscribeSnapshot = onSnapshot(
					userDocRef,
					(docSnap) => {
						if (docSnap.exists()) {
							const data = docSnap.data() as UserDocument;
							setUserData(data);
						} else {
							// ユーザードキュメントが存在しない場合、新規作成
							const newUserData: UserDocument = {
								uid: user.uid,
								email: user.email,
								displayName: user.displayName,
								photoURL: user.photoURL,
								createdAt: serverTimestamp(),
								lastLogin: serverTimestamp(),
								registrationCompleted: false,
								registrationStep: 2,
							};
							setDoc(userDocRef, newUserData)
								.then(() => setUserData(newUserData))
								.catch((err) => {
									console.error('Error setting new user document:', err);
									setError('ユーザードキュメントの作成に失敗しました。');
								});
						}
					},
					(err) => {
						console.error('Error fetching user data:', err);
						setError('ユーザーデータの取得中にエラーが発生しました。');
					}
				);

				// ユーザーがログアウトしたときなど、リスナーのクリーンアップ
				return () => {
					unsubscribeSnapshot();
				};
			} else {
				setUserData(null);
			}
		});

		return () => unsubscribeAuth();
	}, []);

	// Google認証でサインイン
	const signInWithGoogle = async () => {
		try {
			setError(null);
			await signInWithPopup(auth, googleProvider);
		} catch (err: any) {
			console.error('Google sign in error:', err);
			setError('Googleログイン中にエラーが発生しました。もう一度お試しください。');
			throw err;
		}
	};

	// メールパスワードでサインイン
	const signInWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseSignInWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Email/password sign in error:', err);
			if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
				setError('メールアドレスまたはパスワードが正しくありません。');
			} else if (err.code === 'auth/too-many-requests') {
				setError('ログイン試行回数が多すぎます。しばらく経ってから再度お試しください。');
			} else {
				setError('ログイン中にエラーが発生しました。もう一度お試しください。');
			}
			throw err;
		}
	};

	// メールパスワードで新規ユーザー作成
	const createUserWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseCreateUserWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Create user error:', err);
			if (err.code === 'auth/email-already-in-use') {
				setError('このメールアドレスは既に使用されています。');
			} else if (err.code === 'auth/weak-password') {
				setError('パスワードは6文字以上の強力なものを設定してください。');
			} else {
				setError('アカウント作成中にエラーが発生しました。もう一度お試しください。');
			}
			throw err;
		}
	};

	// パスワードリセットメール送信
	const resetPassword = async (email: string) => {
		try {
			setError(null);
			await sendPasswordResetEmail(auth, email);
		} catch (err: any) {
			console.error('Password reset error:', err);
			if (err.code === 'auth/user-not-found') {
				setError('このメールアドレスに登録されているアカウントが見つかりません。');
			} else {
				setError('パスワードリセットメールの送信中にエラーが発生しました。');
			}
			throw err;
		}
	};

	// サインアウト
	const signOut = async () => {
		try {
			await firebaseSignOut(auth);
		} catch (err) {
			console.error('Sign out error:', err);
			setError('ログアウト中にエラーが発生しました。');
			throw err;
		}
	};

	const value = {
		user,
		userData,
		loading,
		signInWithGoogle,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		signOut,
		error,
		clearError
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export const useAuth = () => useContext(AuthContext);
