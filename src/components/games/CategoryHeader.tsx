'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface CategoryHeaderProps {
	category: string;
	title: string;
	description: string;
}

export default function CategoryHeader({ category, title, description }: CategoryHeaderProps) {
	return (
		<header className="bg-border/10 rounded-2xl p-6 md:p-8 shadow-soft mb-6 fixed">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between">
					<Link
						href="/#games"
						className="flex items-center text-foreground hover:text-accent transition-colors"
					>
						<ArrowLeft className="mr-2 h-5 w-5" />
						<span className="font-medium">ゲーム一覧に戻る</span>
					</Link>

					<div className="text-right">
						<h1 className="text-2xl md:text-3xl font-bold animate-fadeIn">{title}</h1>
						<p className="text-accent animate-fadeIn">{description}</p>
					</div>
				</div>
			</div>
		</header>
	);
}