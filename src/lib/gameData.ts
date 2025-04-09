// Define the game categories and their IDs that match the route parameters
export const VALID_CATEGORIES = ['party', 'competitive', 'immersive'];

// Interface for game data
export interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	videoSrc: string;
	thumbnailSrc: string;
	similarGames: string[];
}

export interface CategoryData {
	title: string;
	description: string;
	games: Game[];
}

// Game data - in a real application, this would come from a database or API
export const GAME_DATA: Record<string, CategoryData> = {
	party: {
		title: 'ワイワイ系ゲーム',
		description: 'コントローラーで2人でも盛り上がれる',
		games: [
			{
				id: 'party-animals',
				title: 'Party Animals',
				description: '可愛い動物たちが戦うカオスなパーティーゲーム。ふわふわしたキャラクターで物理演算を利用した格闘ゲームを楽しめます。友達と一緒に遊ぶと最高に盛り上がります。',
				playerCount: '2-8人',
				recommendedTime: '30分-1時間',
				difficulty: '初心者向け',
				videoSrc: '/PartyAnimals.mp4',
				thumbnailSrc: '/images/lp/games/overcooked.png',
				similarGames: ['Fall Guys', 'Gang Beasts']
			},
			{
				id: 'fall-guys',
				title: 'Fall Guys',
				description: '障害物競走のバトルロイヤル！最後まで生き残れ。カラフルなゼリービーンズのようなキャラクターを操作して、様々な障害物コースを突破しながら他のプレイヤーと競争します。',
				playerCount: '1-4人',
				recommendedTime: '20-40分',
				difficulty: '初心者向け',
				videoSrc: '/GolfIt.mp4',
				thumbnailSrc: '/images/lp/games/fallguys.png',
				similarGames: ['Party Animals', 'Pummel Party']
			},
			{
				id: 'pummel-party',
				title: 'Pummel Party',
				description: '友情を破壊するミニゲームコレクション。ボードゲーム形式で進行し、各ターンごとに様々なミニゲームが発生します。友達との競争心を刺激する作品です。',
				playerCount: '4-8人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/Crossout.mp4',
				thumbnailSrc: '/images/lp/games/pummel.png',
				similarGames: ['Mario Party', 'Fall Guys']
			}
		]
	},
	competitive: {
		title: '競技系ゲーム',
		description: '120FPSでぬるぬる動く、プロ仕様',
		games: [
			{
				id: 'counter-strike-2',
				title: 'Counter-Strike 2',
				description: 'タクティカルFPSの金字塔、最新バージョン。テロリストと対テロ部隊に分かれて戦う5対5の対戦型シューティングゲーム。戦略性と正確なエイムが求められます。',
				playerCount: '5v5',
				recommendedTime: '30-90分',
				difficulty: '上級者向け',
				videoSrc: '/CS2.mp4',
				thumbnailSrc: '/images/lp/games/valorant.png',
				similarGames: ['Valorant', 'Rainbow Six Siege']
			},
			{
				id: 'pubg',
				title: 'PUBG',
				description: 'バトルロイヤルの先駆者、100人での生存競争。広大なマップで最後の1人（または1チーム）になるまで戦い続けるサバイバルシューティング。',
				playerCount: '1-4人',
				recommendedTime: '20-30分',
				difficulty: '中級者向け',
				videoSrc: '/Tango.mp4',
				thumbnailSrc: '/images/lp/games/pubg.png',
				similarGames: ['Apex Legends', 'Fortnite']
			},
			{
				id: 'apex-legends',
				title: 'Apex Legends',
				description: '高速移動とチームプレイが特徴のヒーローシューター。独自の能力を持つキャラクターを選び、3人チームで戦うバトルロイヤルゲーム。スムーズな動きと連携が勝利のカギです。',
				playerCount: '3人チーム',
				recommendedTime: '15-25分',
				difficulty: '中級者向け',
				videoSrc: '/WitchIt.mp4',
				thumbnailSrc: '/images/lp/games/apex.png',
				similarGames: ['PUBG', 'Valorant']
			}
		]
	},
	immersive: {
		title: 'じっくり系ゲーム',
		description: '1人でも仲間とでも、じっくり楽しめる',
		games: [
			{
				id: 'operation-tango',
				title: 'Operation: Tango',
				description: '2人協力のスパイアドベンチャー、コミュニケーションが鍵。一方がハッカー役、もう一方がエージェント役となり、お互いに見えている情報を伝え合いながらミッションを遂行します。',
				playerCount: '2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/WeWereHereForever.mp4',
				thumbnailSrc: '/images/lp/games/slaythespire.png',
				similarGames: ['Keep Talking and Nobody Explodes', 'We Were Here']
			},
			{
				id: 'portal-2',
				title: 'Portal 2',
				description: '物理パズルの傑作、協力プレイも可能。ポータルガンを使って空間を自由に行き来しながら、様々なパズルを解いていきます。独特のユーモアと高いゲーム性が魅力です。',
				playerCount: '1-2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/portal.mp4',
				thumbnailSrc: '/images/lp/games/cities.png',
				similarGames: ['The Witness', 'The Talos Principle']
			},
			{
				id: 'the-witness',
				title: 'The Witness',
				description: '美しい島を舞台にした一人称パズルゲーム。線を描くという単純な操作から始まり、徐々に複雑になっていくパズルを解きながら島の謎に迫ります。思考力が試されるゲームです。',
				playerCount: '1人',
				recommendedTime: '2-3時間',
				difficulty: '上級者向け',
				videoSrc: '/WitchIt.mp4',
				thumbnailSrc: '/images/lp/games/witness.png',
				similarGames: ['Portal 2', 'Braid']
			}
		]
	}
};