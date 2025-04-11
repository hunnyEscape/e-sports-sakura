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
								eKYC: {
									status: 'pending'
								}
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
