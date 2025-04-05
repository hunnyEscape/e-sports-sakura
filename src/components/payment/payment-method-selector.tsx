// src/components/payment/payment-method-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useStripe } from '@stripe/react-stripe-js';
import { PAYMENT_METHODS, checkAvailablePaymentMethods } from '@/lib/stripe-payment-methods';
import LoadingSpinner from '@/components/ui/loading-spinner';

type PaymentMethodType = 'card' | 'googlePay' | 'applePay';

interface PaymentMethodSelectorProps {
	onSelect: (method: PaymentMethodType) => void;
	selectedMethod: PaymentMethodType;
}

export default function PaymentMethodSelector({ onSelect, selectedMethod }: PaymentMethodSelectorProps) {
	const stripe = useStripe();
	const [availableMethods, setAvailableMethods] = useState<Record<string, boolean>>({
		card: true,
		googlePay: false,
		applePay: false
	});
	const [loading, setLoading] = useState(true);

	// 利用可能な支払い方法を確認
	useEffect(() => {
		async function checkMethods() {
			if (stripe) {
				setLoading(true);
				const methods = await checkAvailablePaymentMethods(stripe);
				setAvailableMethods(methods);
				setLoading(false);
			}
		}

		if (stripe) {
			checkMethods();
		}
	}, [stripe]);

	if (loading) {
		return (
			<div className="flex justify-center items-center py-4">
				<LoadingSpinner size="small" />
				<span className="ml-2 text-sm text-foreground/70">利用可能な支払い方法を確認中...</span>
			</div>
		);
	}

	return (
		<div className="mb-6">
			<h3 className="text-lg font-medium mb-3">支払い方法</h3>
			<div className="space-y-2">
				{/* カード支払い */}
				<div
					className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'card' ? 'border-accent bg-accent/5' : 'border-border'
						}`}
					onClick={() => onSelect('card')}
				>
					<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<div className="flex-grow">
						<div className="font-medium">クレジット/デビットカード</div>
						<div className="flex mt-1 space-x-1">
							<span className="text-xs text-foreground/70">Visa, Mastercard, AMEX, JCB</span>
						</div>
					</div>
					<div className="flex-shrink-0 ml-2">
						<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'card' ? 'border-accent' : 'border-border'
							}`}>
							{selectedMethod === 'card' && (
								<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
							)}
						</div>
					</div>
				</div>

				{/* Google Pay */}
				{availableMethods.googlePay && (
					<div
						className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'googlePay' ? 'border-accent bg-accent/5' : 'border-border'
							}`}
						onClick={() => onSelect('googlePay')}
					>
						<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
								<path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.5 7.5h5v1.5h-5v-1.5zm9 9.5h-12.5v-7.5h12.5v7.5z" />
							</svg>
						</div>
						<div className="flex-grow">
							<div className="font-medium">Google Pay</div>
						</div>
						<div className="flex-shrink-0 ml-2">
							<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'googlePay' ? 'border-accent' : 'border-border'
								}`}>
								{selectedMethod === 'googlePay' && (
									<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Apple Pay */}
				{availableMethods.applePay && (
					<div
						className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'applePay' ? 'border-accent bg-accent/5' : 'border-border'
							}`}
						onClick={() => onSelect('applePay')}
					>
						<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
								<path d="M19.665 16.811a10.316 10.316 0 0 1-1.021 1.837c-.537.767-.978 1.297-1.316 1.592-.525.482-1.089.73-1.692.744-.432 0-.954-.123-1.562-.373-.61-.249-1.17-.371-1.683-.371-.537 0-1.113.122-1.732.371-.619.25-1.118.381-1.497.396-.577.025-1.154-.229-1.729-.764-.367-.32-.826-.87-1.377-1.648-.59-.829-1.075-1.794-1.455-2.891-.407-1.187-.611-2.335-.611-3.447 0-1.273.275-2.372.826-3.292a4.857 4.857 0 0 1 1.73-1.751 4.65 4.65 0 0 1 2.34-.662c.46 0 1.063.142 1.81.422s1.227.422 1.436.422c.158 0 .689-.167 1.593-.498.853-.307 1.573-.434 2.163-.384 1.6.129 2.801.759 3.6 1.895-1.43.867-2.137 2.08-2.123 3.637.012 1.213.453 2.222 1.317 3.023a4.33 4.33 0 0 0 1.315.863c-.106.307-.218.6-.336.882z" />
							</svg>
						</div>
						<div className="flex-grow">
							<div className="font-medium">Apple Pay</div>
						</div>
						<div className="flex-shrink-0 ml-2">
							<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'applePay' ? 'border-accent' : 'border-border'
								}`}>
								{selectedMethod === 'applePay' && (
									<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}