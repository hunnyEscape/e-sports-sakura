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
							registrationStep: 1,
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
export const useAuth = () => useContext(AuthContext);