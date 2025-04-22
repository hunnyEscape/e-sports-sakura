'use client';
// /src/components/dashboard/monthly-usage-history.tsx
import ActiveSessionDisplay from '@/components/dashboard/ActiveSessionDisplay';
import MonthGroupsDisplay from '@/components/dashboard/MonthGroupsDisplay';
import CouponsTab from '@/components/dashboard/coupons';
export default function MonthlyUsageHistory() {
	return (
		<div className="p-0 md:p-6">
			<CouponsTab/>
			<ActiveSessionDisplay />
			<MonthGroupsDisplay />
		</div>
	);
}
