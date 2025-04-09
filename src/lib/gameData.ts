// Define the game categories and their IDs that match the route parameters
export const VALID_CATEGORIES = ['party', 'competitive', 'immersive'];

export interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	videoSrc: string;
	thumbnailSrc: string;
	rule: string;
}

export interface CategoryData {
	title: string;
	description: string;
	games: Game[];
}
const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

// Game data - in a real application, this would come from a database or API
export const GAME_DATA: Record<string, CategoryData> = {

	party: {
		title: 'ワイワイ系ゲーム',
		description: 'コントローラーで2人でも盛り上がれる',
		games: [
			{
				id: 'party-animals',
				title: 'Party Animals',
				description: `
					可愛い動物たちが戦うカオスな**格闘ゲーム**です。
					ふわふわしたキャラクターで物理演算を利用した操作を楽しめ、予測不能な展開で最高に盛り上がります。
					戦略やタイミングを極めることで勝率を上げられる奥深さもあり、初心者から上級者まで幅広く楽しめるバランスが絶妙に設計されています。
					`,
				playerCount: '2-8人',
				recommendedTime: '30分-2時間',
				difficulty: '初心者向け',
				videoSrc: '/PartyAnimals.mp4',
				thumbnailSrc: `${cloudFrontUrl}/PartyAnimals.webp`,
				rule: `
					ライバルをフィールドから**落とせば勝利**です。
					基本の「パンチ」は、相手を一時的に気絶させるための主要な攻撃手段です。特に顔に当たるように狙うと、より効果的に相手の動きを止めることができます。むやみに連打するのではなく、タイミングよくパンチを当てて、次の動作に繋げることが重要です。
					ジャンプ中に攻撃することで空中キックのような動きになります。これは崖際や接近戦で有効で、相手を弾き飛ばすように使うと、そのままステージ外に落とすことも可能です。
					「掴み」は、『Party Animals』を象徴する動作のひとつです。相手に近づいて掴むと、そのまま持ち上げたり、引きずったりすることができます。特に強力なのが、掴んだ相手をジャンプと同時に投げるようにして場外に放り出すテクニックです。背後から掴めば反撃を受けにくく、飛距離が伸びるので、**安全に投げ落とすことができます**。
					「武器」はマップ上にランダムで出現し、手にしたプレイヤーに大きなアドバンテージをもたらします。バットや棒などの武器は、攻撃範囲と威力が高まり、相手を遠くまでふっ飛ばすことが可能です。クロスボウのような遠距離武器も存在し、状況によって使い分けることで戦況を有利に運ぶことができます。ただし、武器を持っているからといって無敵ではなく、パンチで手から落とされたり、掴まれて無力化されたりする危険もあるため、過信は禁物です。
				`
			},
			{
				id: 'Witch It',
				title: 'Witch It',
				description: `
					魔法の世界を舞台にしたチーム対戦型の**かくれんぼゲーム**です。プレイヤーは「魔女」チームと「ハンター」チームに分かれて勝利を目指します。
					魔女チームは、マップ内の様々なオブジェクト（リンゴ、椅子、木箱、壺など）に変身して隠れることができます。
					ハンターチームは、魔女が化けているであろうオブジェクトを見つけて攻撃し、捕まえます。
					ステージには多種多様なマップがあり、それぞれに特徴的な地形やオブジェクトが配置されているため、毎試合ごとに異なる戦略が必要になります。
					ゲームの**テンポが良く**、1プレイが短時間で終わるため、何度も繰り返し遊びたくなる中毒性があります。
					見た目は可愛らしく、ファンタジックで親しみやすいデザインですが、ゲームとしての深みや**駆け引き**の面白さは非常に高く、友人同士の対戦や配信・実況などにもぴったりのタイトルです。
					魔女として隠れる楽しさと、ハンターとして暴くスリル――この両方を体験できる、独特の魅力を持った作品と言えるでしょう。
				`,
				playerCount: '2人チーム制　4〜8人程度でも十分楽しめるが多人数ほど盛り上がる。最大16人',
				recommendedTime: '1試合：約5〜10分前後、30分-1時間',
				difficulty: '初心者向け',
				videoSrc: '/WitchIt.mp4',
				thumbnailSrc: `${cloudFrontUrl}/WitchIt.webp`,
				rule: `
					魔女にはいくつかのスキルがあり、煙幕で視界を妨害したり、偽物のオブジェクトを出してハンターを混乱させたり、瞬間移動で逃げることができます。制限時間まで1人でも生き残っていれば、魔女チームの勝利です。
					ハンターは、マップ中のオブジェクトに向かって攻撃することで、魔女が変身していないかどうかを確かめていきます。魔女に直接攻撃が当たると、一定時間で捕獲され、退場させることができます。
					攻撃にはクールダウンがあるため、手当たり次第に攻撃することはできません。また、魔女は素早く移動したり、狭い隙間に隠れたり、変身を繰り返したりするため、ハンターには注意力と推理力が求められます。
					ゲームの時間内にすべての魔女を見つけ出すことができれば、ハンター側の勝利です。
				`
			},
			{
				id: 'Golf It',
				title: 'Golf It',
				description: `
					マルチプレイヤー向け物理演算ベースの**パターゴルフゲーム**です。
					予測不可能なコースやギミック、そしてプレイヤー同士の妨害や偶然によって、単なるゴルフゲーム以上のドタバタとした楽しさを味わえる作品となっています。
					バリエーション豊富で想像力に富んだミニゴルフコースが用意されています。
					普通の傾斜や坂道はもちろん、ループ、トランポリン、動く足場、回転する障害物、壁のワープ装置など、常識を超えたステージが満載です。
					しかも、ユーザーが自作したコースを公開・プレイすることができるため、コンテンツは常に増え続けており、飽きが来にくいという点も魅力のひとつです。
				`,
				playerCount: '1-4人',
				recommendedTime: '20-40分',
				difficulty: '初心者向け',
				videoSrc: '/GolfIt.mp4',
				thumbnailSrc: `${cloudFrontUrl}/GolfIt.webp`,
				rule: `
					ルールはとてもシンプルで、各プレイヤーが順番にボールを打ち、できるだけ少ない打数でホール（カップ）にボールを入れることを目指します。
					ボールを打つときは、マウスを使って物理的に引っ張って打つ動作を再現するため、強く打ちすぎて大きく飛ばしてしまったり、逆に弱すぎて進まなかったりと、プレイヤーの感覚が試されるのもこのゲームの面白さです。
					**勝ちを狙うと意外なほど奥深いゲーム**です。
					『Golf It!』の打撃は、マウスを後ろに引いてから前に押し出すことで力を調整します。強すぎるとコースアウト、弱すぎると進まない――この微妙な力加減を体に覚えさせることが、まず勝利の第一歩です。
					最初は「少し弱め」を意識すると安定します。打つ前に、マウスを引いたときのパワーメーター（ゲージ）を見る習慣をつけましょう。
					とにかく焦って打つと、ギミックに跳ね返されたり、罠にハマったりします。初見のコースでは、一打目を打つ前に必ずカメラ（右クリック＋ドラッグ）で全体を見て、どのルートが最適かを判断しましょう。
					コースによっては、高いジャンプや強打を使ってショートカットするルートが用意されています。
					難易度は高めですが、成功すれば2〜3打も差がつくため、慣れてきたらチャレンジする価値は大いにあります。
					特にフレンド対戦では、早くゴールした者勝ちの**空気感**があるので、差をつけやすいです。
				`
			},
			{
				id: 'We Were Here Forever',
				title: 'We Were Here Forever',
				description: `
					二人一組でプレイする**協力型の脱出パズルアドベンチャーゲーム**です。
					プレイヤーは極寒の未知の地に囚われた2人のキャラクターとなり、互いの声だけを頼りに謎を解きながら脱出を目指すという物語が展開されます。
					このゲームは「We Were Here」シリーズの第4作目であり、シリーズ中でも最もスケールが大きく、謎解きのバリエーションやストーリーテリングが進化しています。
					暗号、幾何学的な図形、音楽、視覚的な錯覚、時間制限付きの仕掛けなど、ジャンルの異なる謎解きが連続して登場します。
					しかも、ほとんどのパズルは「片方だけでは絶対に解けない」ように設計されており、**会話力とチームワークが問われるゲームデザインが徹底されています**。
					ストーリーは断片的に語られる形式で、探索を進めながら徐々に真実が明らかになります。
					この世界には「王」「操り人形」「裏切り」「救済」などの重厚なテーマが織り込まれており、ただの脱出ゲームではない物語体験としての魅力も高く評価されています。
					「一緒に乗り越える体験」に特化した、稀有な協力型ゲームです。
					単なる謎解き以上に、相手との意思疎通・信頼・ひらめきが求められるため、**プレイ後には深い絆と達成感が残る作品**となっています。
					「2人でしか体験できない特別なゲーム」を探している方に、心からおすすめできる一本です。
				`,
				playerCount: '2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/WeWereHereForever.mp4',
				thumbnailSrc: `${cloudFrontUrl}/WeWereHereForever.webp`,
				rule: `
				無線のようなボイスチャットを使ってコミュニケーションを取りながら、片方が見ているシンボルや仕掛けのヒントをもう一方に伝え、それぞれの部屋で謎を解いていきます。
				このゲームで一番重要なのは、「自分が見ている情報をどう伝えるか」です。謎解きの答えは、たいてい「相手の視点」にあるため、適切に説明しなければ解けません。
				伝えられた情報をただ受け取るのではなく、相手の状況や視点を想像して補完する力も大切です。
				パズルに行き詰まったと感じたら、無理に1人で考え込まず、「今こうなってる」「今ここに何がある」ととにかく状況を話すことが重要です。
				相手がヒントに気づいてくれることもあります。**情報を「全部伝えてから考える」**が、We Were Hereシリーズの鉄則です。
				`
			},
			{
				id: 'portal-2',
				title: 'Portal 2',
				description: `
				**一人称視点（FPS）の物理パズルゲーム**で2007年に大ヒットした『Portal』の続編です。
				前作の革新的なゲーム性を引き継ぎつつ、より複雑なパズル、魅力的なキャラクター、ユーモアと不気味さが同居するディストピア的な世界観と豊かなストーリー性が特徴です。
				空間を操る感覚を見事に表現し、物語・演出・難易度設計のすべてにおいて**高い評価**を受けています。
				プレイヤーは、「ポータルガン」という特殊な装置を使って空間に二つのポータルを開き、それを活用してステージを突破していくという、独自のゲームプレイを体験します。
				`,
				playerCount: '1-2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/portal.mp4',
				thumbnailSrc: `${cloudFrontUrl}/portal.webp`,
				rule: `
				プレイヤーは「ポータルガン」と呼ばれる特殊な装置を使って、壁や床などに**入口と出口の2つの穴（ポータル）**を自由に開くことができます。
				ポータルは2つの空間を瞬時につなぐワープホールのようなものです。
				何度でもやり直せるので、まずは試す → 結果を見る →考え直すというプロセスをポジティブに楽しみましょう。
				ポータルの面白さは、ただ移動できるだけでなく、**物理的なエネルギー**（落下速度やジャンプ）を引き継げることです。
				これを利用して、高く跳ぶ、遠くへ飛ばす、タイミングよく飛び込む…など、動きの工夫が求められるステージが多く登場します。
				「高所から落ちた勢いをポータルで前方に転換」など、**慣性利用の基本**は必ず覚えましょう。
				相手に「勢いをつける役」と「ゴールに届く役」を分けて役割分担するのも有効です。
				`
			},
			{
				id: 'Operation:Tango',
				title: 'Operation:Tango',
				description: `
				2人専用の**協力型スパイアクション・パズルゲーム**です。
				プレイヤーは「エージェント」と「ハッカー」のいずれかを担当し、ペアで連携を取りながら、世界を脅かすサイバー犯罪に立ち向かう――というスリリングなミッションを遂行していきます。
				エージェントは現場潜入担当で、ハッカーがバックエンドサポートを担います。
				**プレイヤー同士の視界や情報が完全に異なる**ため、自分の状況をどう説明するか、相手の言葉をどう解釈するかがカギになります。
				銀行への潜入、空港でのハッキング、仮想空間への侵入など、スパイ映画のようなミッションが続々と登場します。
				`,
				playerCount: '2人',
				recommendedTime: '4-6時間(役割交代すればもう一周楽しめる)',
				difficulty: '中級者向け',
				videoSrc: '/Tango.mp4',
				thumbnailSrc: `${cloudFrontUrl}/Tango.webp`,
				rule: `
				まず**「自分が今、何を見ているのか」「何をしているのか」を、なるべく具体的に口に出すことがコツ**です。「左下に白いパネルがあって、今赤く点滅している」「数字が3つ表示されていて、上から緑・青・赤の順になっている」といったように、色・位置・順番などを意識して説明することで、相手も的確に反応できるようになります。
				わからない部分はすぐに質問する姿勢も大切です。ゲーム中は複雑な暗号入力や、時間制限のあるミッションも多いため、「焦らず、確認する」「すれ違いがあればすぐ修正する」という冷静さが成功への近道となります。
				さらに、謎解きに詰まったときは、つい自分の目の前の情報だけで解決しようとしてしまいがちですが、『Operation: Tango』では、たいていの場合、**答えのヒントは自分ではなく、相手の画面に存在しています**。「そっちで何か見えてない？」という問いかけをすることが、ミッションを前に進めるうえで重要です。
				このゲームは、繰り返し挑戦することで自然と**「伝え方」「聞き方」「動き方」が上達していく**構造になっています。最初は失敗しても気にせず、会話を楽しみながら、少しずつスムーズに連携できるようになる喜びを味わうのが、この作品の大きな醍醐味です。
				`
			},
			{
				id: 'counter-strike-2',
				title: 'Counter-Strike 2',
				description: `
				競技性の高いオンライン対戦型の**一人称視点(FPS)シューティングゲーム**です。これは、2000年代初頭に登場し、世界中で**eスポーツの先駆け的存在**となった『Counter-Strike』シリーズの最新作です。
				テロリストと対テロ部隊という二つの勢力に分かれ対戦します。
				前作と比べてネットワークの応答性が向上したことで、**対戦の公正さや一瞬の撃ち合いの精度**が格段に上がっています。**勝敗を分けるような一瞬の撃ち合い**が忠実に反映されるようになりました。
				敷居が高いと思われがちですが、実際には初心者が少しずつ**上達を実感しやすいゲーム**でもあります。
				このゲームの最大の魅力は、シンプルなルールの中に、プレイヤーの**個性と判断力が強く反映される**ところにあります。走るのか待つのか、正面から撃ち合うのか裏を取るのか、単独行動を選ぶのか仲間と連携するのか。すべての行動が自由で、しかしすべてに意味があり、その積み重ねがチームの勝利へとつながっていきます。
				『Counter-Strike 2』は、世界中のプレイヤーたちにとって、長年の経験がそのまま蓄積される「知のFPS」でありながら、今この瞬間から誰でも始められる、極めてフェアな設計のゲームです。もしあなたが、頭を使いながらチームと連携し、一発一発に意味のある対戦ゲームを探しているなら、このゲームはまさにうってつけだと言えるでしょう。試しに1ラウンドでもプレイしてみれば、きっとその緊張感と達成感に引き込まれるはずです。			
				`,
				playerCount: '5v5',
				recommendedTime: '∞',
				difficulty: '上級者向け',
				videoSrc: '/CS2.mp4',
				thumbnailSrc: `${cloudFrontUrl}/CS2.webp`,
				rule: `
				テロリスト側は爆弾を持ち、特定のエリアに設置して時間内に爆発させることで勝利を目指します。一方、対テロ部隊側は、その爆弾の設置を防ぐか、設置後に制限時間内で解除することが任務です。
				この攻防は「ラウンド制」で進行し、各ラウンドの開始時にプレイヤーは**限られた資金を元に装備を整える必要**があります。
				つまり、プレイヤーたちは毎ラウンドごとに自分の手持ち資金と相談しながら、どの武器を買うか、グレネードを持つか、防具を優先するかなどを考えなければならず、「戦う準備の時点ですでにゲームは始まっている」と言えます。
				プレイヤーが得られるお金は、単に敵を倒すだけではなく、ラウンドに勝利する、爆弾を設置する、あるいは解除するといった**“チームに貢献する行動すべて”**によって変動します。
				つまり、キル数が多いプレイヤーだけが強くなるのではなく、冷静に爆弾を設置し、仲間をカバーし、チームとして勝利することで、次のラウンドに有利な装備が整っていくという設計です。
				ここに、短期的な撃ち合いの強さと、長期的な資金計画とのバランスが求められる理由があります。


				また射撃はただ単に**「敵に向けて撃てば当たる」というようなものではありません**。
				各武器には独自のリコイル（反動）パターンが設定されており、フルオートで撃ち続けると照準が上や左右に大きくブレます。
				これを抑えるためには、リコイルを“覚える”だけでなく、自分のマウス操作で**その反動に逆らうように制御するテクニック**が不可欠です。さらには、撃ち方にも工夫が求められます。
				たとえば、1発1発をタップして正確に当てる、3発ごとに止めながら撃つバーストショットを使う、しゃがんで撃つことで安定させるなど、状況に応じて撃ち方を変える判断力が上達への鍵になります。
				ルールは非常にシンプルである一方で、その中にはプレイヤーの操作スキル、金銭管理、マップ理解、連携力、そして心理戦という多層的なゲーム性が詰まっています。
				「どこで、どう動き、どう伝え、どう勝つか」を常に考え続けることが求められ、そしてそれこそがこのゲームの最大の魅力でもあるのです。
				初心者であっても、1つのラウンドで爆弾を設置できたり、仲間をサポートできたりしたときの充実感は大きく、少しずつ「自分が戦力になっている」という感覚を得られるようになるでしょう。
				`
			},
		]
	},
	competitive: {
		title: 'PCゲームっぽいゲーム',
		description: '120FPSでぬるぬる動く、プロ仕様',
		games: [
		]
	},
	immersive: {
		title: 'じっくり系ゲーム',
		description: '1人でも仲間とでも、じっくり楽しめる',
		games: [

		]
	}
};