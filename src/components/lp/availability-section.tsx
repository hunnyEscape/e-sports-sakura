import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Users, Clock } from 'lucide-react';
import AvailabilityCalendar from './availability-calendar';

const AvailabilitySection: React.FC = () => {
	return (
		// h-auto を追加し、min-h-real-screen-80 を使用して安定した高さを確保
		<section className="py-20 bg-background/70 h-auto min-h-real-screen-80">
			<div className="container mx-auto px-4">
				{/* Section header */}
				<div className="text-center mb-12">
					<motion.h2
						className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						空き状況をチェック
					</motion.h2>
					<motion.p
						className="text-foreground/70 max-w-2xl mx-auto"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, delay: 0.1 }}
					>
						リアルタイムで座席の空き状況を確認できます。
						お好きな日時を選んで、快適なゲーム環境を予約しましょう。
					</motion.p>
				</div>

				<div className="flex flex-col lg:flex-row gap-10 items-center">
					{/* Calendar column */}
					<motion.div
						className="w-full lg:w-2/3 bg-background rounded-2xl shadow-soft p-6 border border-border/20"
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<AvailabilityCalendar />
					</motion.div>

					{/* Info column */}
					<motion.div
						className="w-full lg:w-1/3 space-y-8"
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						{/* Feature 1 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mr-4">
								<CalendarCheck className="w-6 h-6 text-accent" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">事前予約</h3>
								<p className="text-foreground/70">
									お気に入りの座席を確保して、安心してご利用いただけます。
								</p>
							</div>
						</div>

						{/* Feature 2 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-highlight/10 flex items-center justify-center flex-shrink-0 mr-4">
								<Clock className="w-6 h-6 text-highlight" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">柔軟な利用時間</h3>
								<p className="text-foreground/70">
									30分単位で予約可能。急な予定変更にも対応できます。キャンセルは無料です。
								</p>
							</div>
						</div>

						{/* Feature 3 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-border/20 flex items-center justify-center flex-shrink-0 mr-4">
								<Users className="w-6 h-6 text-foreground" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">グループ予約</h3>
								<p className="text-foreground/70">
									友達と一緒に遊びたい場合は、複数席の同時予約も可能。チーム対戦やパーティープレイを楽しめます。
								</p>
							</div>
						</div>

						{/* CTA button */}
						<div className="pt-4">
							<motion.button
								className="w-full py-3 px-6 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => window.location.href = '/reservation'}
							>
								予約画面を開く
							</motion.button>
							<p className="text-xs text-center mt-2 text-foreground/60">
								※予約には会員登録(無料)が必要です
							</p>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default AvailabilitySection;