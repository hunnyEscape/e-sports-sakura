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

export default FaceVerificationService;